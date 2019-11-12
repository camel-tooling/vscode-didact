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
import { extensionFunctions, initializeContext } from './extensionFunctions';
import * as commandConstants from './extensionFunctions';
import { DidactWebviewPanel } from './didactWebView';
import { DidactNodeProvider, TreeNode } from './nodeProvider';
import { registerTutorial } from './utils';


const DIDACT_VIEW = 'didact.tutorials';

const DEFAULT_TUTORIAL_URI = "https://raw.githubusercontent.com/bfitzpat/vscode-didact/master/demo/didact-demo.md";
const DEFAULT_TUTORIAL_CATEGORY = "Didact";
const DEFAULT_TUTORIAL_NAME = "Didact Demo";

let didactTutorialsProvider = new DidactNodeProvider();
let didactTreeView : vscode.TreeView<TreeNode>;

export async function activate(context: vscode.ExtensionContext) {

	initializeContext(context); // stash context for command use

	// register all the various commands we provide
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.SCAFFOLD_PROJECT_COMMAND, extensionFunctions.scaffoldProjectFromJson));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.CREATE_WORKSPACE_FOLDER_COMMAND, extensionFunctions.createTemporaryFolderAsWorkspaceRoot));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.OPEN_TUTORIAL_COMMAND, extensionFunctions.openDidactWithDefault));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.START_DIDACT_COMMAND, extensionFunctions.startDidact));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.START_TERMINAL_COMMAND, extensionFunctions.startTerminal));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.SEND_TERMINAL_SOME_TEXT_COMMAND, extensionFunctions.sendTerminalText));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.REQUIREMENT_CHECK_COMMAND, extensionFunctions.requirementCheck));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.EXTENSION_REQUIREMENT_CHECK_COMMAND, extensionFunctions.extensionCheck));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.WORKSPACE_FOLDER_EXISTS_CHECK_COMMAND, extensionFunctions.validWorkspaceCheck));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.RELOAD_DIDACT_COMMAND, extensionFunctions.reloadDidact));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.VALIDATE_ALL_REQS_COMMAND, extensionFunctions.validateAllRequirements));
	context.subscriptions.push(vscode.commands.registerCommand(commandConstants.VIEW_OPEN_TUTORIAL_MENU, extensionFunctions.openTutorialFromView));

	// set up the vscode URI handler
	vscode.window.registerUriHandler({
		async handleUri(uri:vscode.Uri) {
			await vscode.commands.executeCommand(commandConstants.START_DIDACT_COMMAND, uri);
		}
	});

	// if there are changes in the workspace (i.e. a new root folder being added), refresh the didact window
 	vscode.workspace.onDidChangeWorkspaceFolders( async () => {
		 await vscode.commands.executeCommand(commandConstants.RELOAD_DIDACT_COMMAND);
 	});

	// set up so we don't lose the webview contents each time it goes 'invisible' 
	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(DidactWebviewPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				DidactWebviewPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}

	await registerTutorial(DEFAULT_TUTORIAL_NAME, DEFAULT_TUTORIAL_URI, DEFAULT_TUTORIAL_CATEGORY);
	await registerTutorial('Your First Integration', 'https://raw.githubusercontent.com/bfitzpat/vscode-didact/master/example/camelk/first-integration.md', 'Apache Camel K');
	createIntegrationsView();
}

function createIntegrationsView(): void {
	didactTreeView = vscode.window.createTreeView(DIDACT_VIEW, {
		treeDataProvider: didactTutorialsProvider
	});
	didactTreeView.onDidChangeVisibility(async () => {
		if (didactTreeView.visible === true) {
			await didactTutorialsProvider.refresh().catch(err => console.log(err));
		}
	});
}

export function deactivate() {}
