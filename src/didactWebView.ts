/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as vscode from 'vscode';
import * as extensionFunctions from './extensionFunctions';
import * as path from 'path';
import * as commandHandler from './commandHandler';
import * as fs from 'fs';
import { ViewColumn } from 'vscode';
import { getLastColumnUsedSetting, setLastColumnUsedSetting, DIDACT_DEFAULT_URL } from './utils';

export class DidactWebviewPanel {
	
	/**
	 * Track the current panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: DidactWebviewPanel | undefined;

	public static readonly viewType = 'didact';
	private static readonly didactCachePath = `didact/cache`;
	private static readonly didactCacheHtmlFile = 'currentHtml.html';
	private static readonly didactCacheTitleFile = 'currentTitle.txt';
	private static readonly didactCacheUriFile = 'currentUri.txt';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private static context :  vscode.ExtensionContext | undefined = undefined;
	private _disposables: vscode.Disposable[] = [];
	private currentHtml : string | undefined = undefined;
	private didactStr : string | undefined = undefined;
	private didactUriPath : vscode.Uri | undefined = undefined;
	private defaultTitle = `Didact Tutorial`;
	private isAsciiDoc = false;
	private _disposed = false;

	public setIsAsciiDoc(flag : boolean): void {
		this.isAsciiDoc = flag;
	}

	public static setContext(ctxt : vscode.ExtensionContext): void {
		DidactWebviewPanel.context = ctxt;
	}

	public getDidactUriPath(): vscode.Uri | undefined {
		return this.didactUriPath;
	}

	public setDidactStr(value: string | undefined): void {
		this.didactStr = value;
	}

	public getCurrentHTML() : string | undefined {
		return this.currentHtml;
	}

	getDidactStr(): string | undefined {
		return this.didactStr;
	}

	// public for testing purposes
	public getDidactDefaultTitle() : string | undefined {
		if (DidactWebviewPanel.currentPanel) {
			return DidactWebviewPanel.currentPanel.defaultTitle;
		}
		return undefined;
	}

	public setDidactUriPath(inpath : vscode.Uri | undefined): void {
		this.didactUriPath = inpath;
		if (inpath) {
			const tempFilename = path.basename(inpath.fsPath);
			if (DidactWebviewPanel.currentPanel) {
				DidactWebviewPanel.currentPanel.defaultTitle = tempFilename;
			}
		}
		this._update(true);
	}

	private updateDefaultTitle() {
		if (DidactWebviewPanel.currentPanel) {
			if (DidactWebviewPanel.currentPanel.currentHtml) {
				const firstHeading : string | undefined = this.getFirstHeadingText();
				if (firstHeading && firstHeading.trim().length > 0) {
					this.defaultTitle = firstHeading;
				}
			}
		}
	}

	private updateWebViewTitle() {
		if (DidactWebviewPanel.currentPanel) {
			DidactWebviewPanel.currentPanel._panel.title = this.defaultTitle;
		}
	}

	public static hardReset(): void {
		if (DidactWebviewPanel.currentPanel) {
			DidactWebviewPanel.currentPanel.setDidactStr(undefined);
			const configuredUri : string | undefined = vscode.workspace.getConfiguration().get(DIDACT_DEFAULT_URL);
			if (configuredUri) {
				const defaultUri = vscode.Uri.parse(configuredUri);
				DidactWebviewPanel.currentPanel.setDidactUriPath(defaultUri);
			}
			DidactWebviewPanel.currentPanel._update(true);
		}
	}

	public static createOrShow(extensionPath: string, inpath?: vscode.Uri | undefined, column?: ViewColumn): void {
		if (!column) {
			// if we weren't passed a column, use the last column setting
			column = getLastColumnUsedSetting();
		} else {
			// if we are passed a column, stash it
			setLastColumnUsedSetting(column);
		}

		// If we already have a panel, dispose it to reset the resource roots
		// we assume that all images are in the same directory as the didact file or a 
		// folder under the directory the didact file is in
		if (DidactWebviewPanel.currentPanel) {
			DidactWebviewPanel.currentPanel._panel.dispose();
		}

		// Otherwise, create a new panel.
		const localResourceRoots = [vscode.Uri.file(path.resolve(extensionPath, 'media'))];
		if (inpath) {
			const dirName = path.dirname(inpath.fsPath);
			localResourceRoots.push(vscode.Uri.file(dirName));
		}

		const localIconPath = vscode.Uri.file(path.resolve(extensionPath, 'icon/logo.svg'));
		const iconDirPath = path.dirname(localIconPath.fsPath);
		localResourceRoots.push(vscode.Uri.file(iconDirPath));

		const panel = vscode.window.createWebviewPanel(
			DidactWebviewPanel.viewType, 'didact',
			column,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: localResourceRoots, 

				// persist the state 
				retainContextWhenHidden: true
			}
		);
		panel.iconPath = localIconPath;

		DidactWebviewPanel.currentPanel = new DidactWebviewPanel(panel, extensionPath);
		if (inpath) {
			DidactWebviewPanel.currentPanel.setDidactUriPath(inpath);
		}
		DidactWebviewPanel.currentPanel.setActiveContext(true);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string): void {
		DidactWebviewPanel.currentPanel = new DidactWebviewPanel(panel, extensionPath);
		DidactWebviewPanel.currentPanel.setActiveContext(true);
	}

	public static async postMessage(message: string): Promise<void> {
		if (!DidactWebviewPanel.currentPanel) {
			return;
		}
		const jsonMsg:string = "{ \"command\": \"sendMessage\", \"data\": \"" + message + "\"}";
		console.log("outgoing message being posted: " + jsonMsg);
		DidactWebviewPanel.currentPanel._panel.webview.postMessage(jsonMsg);
	}

	public static async postRequirementsResponseMessage(requirementName: string, result: boolean): Promise<void> {
		if (!DidactWebviewPanel.currentPanel) {
			return;
		}
		const jsonMsg:string = "{ \"command\": \"requirementCheck\", \"requirementName\": \"" + requirementName + "\", \"result\": \"" + result + "\"}";
		console.log("outgoing message being posted: " + jsonMsg);
		DidactWebviewPanel.currentPanel._panel.webview.postMessage(jsonMsg);
	}

	static async postNamedSimpleMessage(msg: string): Promise<void> {
		if (!DidactWebviewPanel.currentPanel) {
			return;
		}
		const jsonMsg = `{ "command" : "${msg}"}`;
		console.log("outgoing message being posted: " + jsonMsg);
		DidactWebviewPanel.currentPanel._panel.webview.postMessage(jsonMsg);		
	}

	public static async postTestAllRequirementsMessage(): Promise<void> {
		DidactWebviewPanel.postNamedSimpleMessage("allRequirementCheck");
	}

	public static async postCollectAllRequirementsMessage(): Promise<void> {
		DidactWebviewPanel.postNamedSimpleMessage("returnRequirements");
	}

	public static async postCollectAllCommandIdsMessage(): Promise<void> {
		DidactWebviewPanel.postNamedSimpleMessage("returnCommands");
	}

	public setActiveContext(value: boolean): void {
		vscode.commands.executeCommand('setContext', 'didact.webview', value);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.onDidChangeViewState(async () => await setLastColumnUsedSetting(panel.viewColumn));

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			() => {
				if (this._panel.visible) {
					this._update();
				} else if (!this._panel.visible) {
					DidactWebviewPanel.cacheFile();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async message => {
				console.log(message);
				switch (message.command) {
					case 'update':
						if (message.text) {
							this.currentHtml = message.text;
						}
						return;
					case 'link':
						if (message.text) {
							try {
								await commandHandler.processInputs(message.text, this._extensionPath);
							} catch (error) {
								vscode.window.showErrorMessage(`Didact was unable to call commands: ${message.text}: ${error}`);
							}
						}
						return;
					}
			},
			null,
			this._disposables
		);
	}

	public static async cacheFile(): Promise<void> {
		if (DidactWebviewPanel.currentPanel && DidactWebviewPanel.currentPanel.getCurrentHTML()) {
			const html = DidactWebviewPanel.currentPanel.getCurrentHTML();
			if (html) {
				await this.createHTMLCacheFile(html);
				console.log('Didact content cached');
			}
		}
	}

	public async dispose(): Promise<void> {
		if (this._disposed) {
			return;
		}

		this._disposed = true;
		DidactWebviewPanel.cacheFile();
		DidactWebviewPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	getNonce() : string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	produceStylesheetHTML(cssUriHtml : string) : string {
		let stylesheetHtml = '';

		if (this.isAsciiDoc) {
			// use asciidoctor-default.css with import from 
			// https://cdn.jsdelivr.net/gh/asciidoctor/asciidoctor@v2.0.10/data/stylesheets/asciidoctor-default.css
			const adUriHtml = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/asciidoctor/asciidoctor@v2.0.10/data/stylesheets/asciidoctor-default.css"/>`;
			stylesheetHtml = `${adUriHtml}\n ${cssUriHtml}\n`;
		} else {
			// use bulma.min.css as the default stylesheet for markdown from https://bulma.io/
			const bulmaCssHtml = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.8.0/css/bulma.min.css"/>`;
			stylesheetHtml = `${bulmaCssHtml}\n ${cssUriHtml}\n`;
		}

		return stylesheetHtml;
	}

	wrapDidactContent(didactHtml: string | undefined) : string | undefined {
		if (!didactHtml || this._disposed) {
			return;
		}
		const nonce = this.getNonce();
		
		// Base uri to support images
		const didactUri : vscode.Uri = this.didactUriPath as vscode.Uri;
		
		let uriBaseHref = undefined;
		try {
			const didactUriPath = path.dirname(didactUri.fsPath);
			const uriBase = this._panel.webview.asWebviewUri(vscode.Uri.file(didactUriPath)).toString();
			uriBaseHref = `<base href="${uriBase}${uriBase.endsWith('/') ? '' : '/'}"/>`;
		} catch (error) {
			console.error(error);
		}
		
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.resolve(this._extensionPath, 'media', 'main.js')
		);

		// And the uri we use to load this script in the webview
		const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });

		// the cssUri is our path to the stylesheet included in the security policy
		const cssPathOnDisk = vscode.Uri.file(
			path.resolve(this._extensionPath, 'media', 'webviewslim.css')
		);
		const cssUri = cssPathOnDisk.with({ scheme: 'vscode-resource' });

		// this css holds our overrides for both asciidoc and markdown html
		const cssUriHtml = `<link rel="stylesheet" href="${cssUri}"/>`;

		// process the stylesheet details for asciidoc or markdown-based didact files
		const stylesheetHtml = this.produceStylesheetHTML(cssUriHtml);

		const extensionHandle = vscode.extensions.getExtension(extensionFunctions.EXTENSION_ID);
		let didactVersionLabel = 'Didact';
		if (extensionHandle) {
			const didactVersion = extensionHandle.packageJSON.version;
			if (didactVersion) {
				didactVersionLabel += ` ${didactVersion}`;
			}
		}

		let metaHeader = `<meta charset="UTF-8"/>
			<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data: https: http: blob: ${this._panel.webview.cspSource}; media-src vscode-resource: https: data:; script-src 'nonce-${nonce}' https:; style-src 'unsafe-inline' ${this._panel.webview.cspSource} https: data:; font-src ${this._panel.webview.cspSource} https: data:; object-src 'none';"/>`;
		if (uriBaseHref) {
			metaHeader += `\n${uriBaseHref}\n`;
		}
		
		const completedHtml = `<!DOCTYPE html>
		<html lang="en">
		<head>
			${metaHeader}
			<title>Didact Tutorial</title>` + 
			stylesheetHtml + 
			`<script defer="true" src="https://use.fontawesome.com/releases/v5.3.1/js/all.js"></script>
		</head>
		<body class="content">
			<div class="tutorialContent">`
			+ didactHtml + 
			`</div> 
			<div class="didactFooter">${didactVersionLabel}</div>
			<script nonce="${nonce}" src="${scriptUri}"/>
		</body>
		</html>`;

		return completedHtml;
	}

	private async _update(flag? : boolean ) {
		if (flag) { // reset based on vscode link
			const content = await extensionFunctions.getWebviewContent();
			if (content) {
				this.currentHtml = this.wrapDidactContent(content);
			}
		} else {
			const cachedHtml = this.getCachedHTML();
			if (cachedHtml) {
				this.currentHtml = cachedHtml;
				const cachedTitle = this.getCachedTitle();
				if (cachedTitle) {
					if (DidactWebviewPanel.currentPanel) {
						DidactWebviewPanel.currentPanel.defaultTitle = cachedTitle;
					}
				}
				console.log('Retrieved cached Didact content');
			} else if (!this.currentHtml) {
				if (this.getDidactStr()) {
					this.currentHtml = this.wrapDidactContent(this.getDidactStr());
				} else {
					const isAdoc = extensionFunctions.isAsciiDoc();
					const content = await extensionFunctions.getWebviewContent();
					if (content) {
						this.currentHtml = this.wrapDidactContent(content);
						this.setIsAsciiDoc(isAdoc);
					}
				}
			}
		}
		if (this.currentHtml) {
			DidactWebviewPanel.cacheFile(); // update the cache with the new content
			this._panel.webview.html = this.currentHtml;
		}
		if (DidactWebviewPanel.currentPanel) {
			// try to get a better title from the html if we can
			this.updateDefaultTitle();
			DidactWebviewPanel.currentPanel.updateWebViewTitle();
		}
	}

	static async createHTMLCacheFile(html : string) {
		if (DidactWebviewPanel.context) {
			if (!DidactWebviewPanel.context.globalStoragePath) {
				fs.mkdirSync(DidactWebviewPanel.context.globalStoragePath, { recursive: true });
			}
			const cachePath = path.resolve(DidactWebviewPanel.context.globalStoragePath, DidactWebviewPanel.didactCachePath);
			const htmlFilePath = path.resolve(cachePath, DidactWebviewPanel.didactCacheHtmlFile);
			const titleFilePath = path.resolve(cachePath, DidactWebviewPanel.didactCacheTitleFile);
			const uriFilePath = path.resolve(cachePath, DidactWebviewPanel.didactCacheUriFile);
			try {
				if (!fs.existsSync(`"${cachePath}"`)) {
					fs.mkdirSync(path.resolve(DidactWebviewPanel.context.globalStoragePath, DidactWebviewPanel.didactCachePath), { recursive: true });
				}
				fs.writeFileSync(htmlFilePath, html, {encoding:'utf8', flag:'w'});
				if (DidactWebviewPanel.currentPanel) {
					fs.writeFileSync(titleFilePath, DidactWebviewPanel.currentPanel.defaultTitle, {encoding:'utf8', flag:'w'});

					if (DidactWebviewPanel.currentPanel.didactUriPath) {
						fs.writeFileSync(uriFilePath, DidactWebviewPanel.currentPanel.didactUriPath.fsPath, {encoding:'utf8', flag:'w'});
					}
				}
			}
			catch (error) {
				return console.error(error);
			}
		}
	}

	getFileContentsFromCache(filename : string) : string | undefined {
		if (DidactWebviewPanel.context) {
			const cachePath = path.resolve(DidactWebviewPanel.context.globalStorageUri.fsPath, DidactWebviewPanel.didactCachePath);
			if (cachePath) {
				const filePath = path.resolve(cachePath, filename);
				try {
					if (fs.existsSync(`"${filePath}"`)) {
						const contents : Buffer = fs.readFileSync(`"${filePath}"`);
						return contents.toLocaleString();
					}
				} catch (error) {
					console.error(error);
				}
			}
		}
		return undefined;
	}
	
	getCachedHTML() : string | undefined {
		return this.getFileContentsFromCache(DidactWebviewPanel.didactCacheHtmlFile);
	}

	getCachedTitle() : string | undefined {
		return this.getFileContentsFromCache(DidactWebviewPanel.didactCacheTitleFile);
	}

	public getCachedUri() : string | undefined {
		return this.getFileContentsFromCache(DidactWebviewPanel.didactCacheUriFile);
	}

	getFirstHeadingText() : string | undefined {
		const h1 = extensionFunctions.collectElements('h1');
		if (h1 && h1.length > 0 && h1[0].innerText) {
			return h1[0].innerText;
		}
		const h2 = extensionFunctions.collectElements('h2');
		if (h2 && h2.length > 0 && h2[0].innerText) {
			return h2[0].innerText;
		}
		return undefined;
	}

	getColumn() : vscode.ViewColumn | undefined {
		if (this._panel) {
			return this._panel.viewColumn;
		}
		return undefined;
	}

	getPanel() : vscode.WebviewPanel | undefined {
		if (this._panel) {
			return this._panel;
		}
		return undefined;
	}
}
