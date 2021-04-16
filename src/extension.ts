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
import { DidactNodeProvider, SimpleNode } from './nodeProvider';
import { registerTutorialWithCategory, clearRegisteredTutorials, getOpenAtStartupSetting, 
	clearOutputChannels, registerTutorialWithJSON, getAutoInstallDefaultTutorialsSetting,
	addNewTutorialWithNameAndCategoryForDidactUri, 
	removeTutorialByNameAndCategory,
	getValue} from './utils';
import { DidactUriCompletionItemProvider } from './didactUriCompletionItemProvider';
import { DidactPanelSerializer } from './didactPanelSerializer';
import { didactManager, VIEW_TYPE } from './didactManager';
import { handleVSCodeDidactUriParsingForPath, handleVSCodeUri, sendTextToOutputChannel } from './extensionFunctions';
import * as querystring from 'querystring';

const DIDACT_VIEW = 'didact.tutorials';

export const DEFAULT_TUTORIAL_CATEGORY = "Didact";
export const DEFAULT_TUTORIAL_NAME = "Didact Demo";

export const didactTutorialsProvider = new DidactNodeProvider();
let didactTreeView : vscode.TreeView<SimpleNode>;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	
	extensionFunctions.initialize(context);

	// register all the various commands we provide
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.SCAFFOLD_PROJECT_COMMAND, extensionFunctions.scaffoldProjectFromJson));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.CREATE_WORKSPACE_FOLDER_COMMAND, extensionFunctions.createTemporaryFolderAsWorkspaceRoot));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.OPEN_TUTORIAL_COMMAND, extensionFunctions.openDidactWithDefault));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.START_DIDACT_COMMAND, extensionFunctions.revealOrStartDidactByURI));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.START_TERMINAL_COMMAND, extensionFunctions.startTerminal));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.SEND_TERMINAL_SOME_TEXT_COMMAND, extensionFunctions.sendTerminalText));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.REQUIREMENT_CHECK_COMMAND, extensionFunctions.requirementCheck));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.EXTENSION_REQUIREMENT_CHECK_COMMAND, extensionFunctions.extensionCheck));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.WORKSPACE_FOLDER_EXISTS_CHECK_COMMAND, extensionFunctions.validWorkspaceCheck));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.RELOAD_DIDACT_COMMAND, extensionFunctions.reloadDidact));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.VALIDATE_ALL_REQS_COMMAND, extensionFunctions.validateAllRequirements));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.VIEW_OPEN_TUTORIAL_MENU, extensionFunctions.openTutorialFromView));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.REGISTER_TUTORIAL, extensionFunctions.registerTutorial));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.REFRESH_DIDACT_VIEW, refreshTreeview));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.SEND_TERMINAL_KEY_SEQUENCE, extensionFunctions.sendTerminalCtrlC));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.CLOSE_TERMINAL, extensionFunctions.closeTerminal));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.CLI_SUCCESS_COMMAND, extensionFunctions.cliExecutionCheck));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.VALIDATE_COMMAND_IDS, extensionFunctions.validateCommandIDsInSelectedFile));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.TEXT_TO_CLIPBOARD_COMMAND, extensionFunctions.placeTextOnClipboard));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.COPY_FILE_URL_TO_WORKSPACE_COMMAND, extensionFunctions.copyFileFromURLtoLocalURI));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.OPEN_NAMED_OUTPUTCHANNEL_COMMAND, extensionFunctions.openNamedOutputChannel));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.SEND_TO_NAMED_OUTPUTCHANNEL_COMMAND, extensionFunctions.sendTextToNamedOutputChannel));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.FILE_TO_CLIPBOARD_COMMAND, extensionFunctions.copyFileTextToClipboard));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.PASTE_TO_ACTIVE_EDITOR_COMMAND, extensionFunctions.pasteClipboardToActiveEditorOrPreviouslyUsedOne));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.PASTE_TO_EDITOR_FOR_FILE_COMMAND, extensionFunctions.pasteClipboardToEditorForFile));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.PASTE_TO_NEW_FILE_COMMAND, extensionFunctions.pasteClipboardToNewTextFile));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.REFRESH_DIDACT, extensionFunctions.refreshDidactWindow));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.CLEAR_DIDACT_REGISTRY, clearRegisteredTutorials));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.ADD_TUTORIAL_TO_REGISTRY, registerTutorialWithJSON));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.ADD_TUTORIAL_URI_TO_REGISTRY, addNewTutorialWithNameAndCategoryForDidactUri));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.REMOVE_TUTORIAL_BY_NAME_AND_CATEGORY_FROM_REGISTRY, removeTutorialByNameAndCategory));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.OPEN_TUTORIAL_HEADING_FROM_VIEW, didactManager.openHeading));
	context.subscriptions.push(vscode.commands.registerCommand(extensionFunctions.PROCESS_VSCODE_LINK, handleVSCodeUri));	

	// set up the vscode URI handler
	vscode.window.registerUriHandler({
		async handleUri(uri:vscode.Uri) {
			await handleVSCodeUri(uri);
		}
	});

	// set up our completion providers
	const markdown:vscode.DocumentSelector = { scheme: 'file', language: 'markdown', pattern: '**/**.didact.md' };
	const asciidoc:vscode.DocumentSelector = { scheme: 'file', language: 'asciidoc', pattern: '**/**.didact.adoc' };
	const completionProvider = new DidactUriCompletionItemProvider(context);
	vscode.languages.registerCompletionItemProvider(markdown, completionProvider);
	vscode.languages.registerCompletionItemProvider(asciidoc, completionProvider);

	// if there are changes in the workspace (i.e. a new root folder being added), refresh the didact window
	vscode.workspace.onDidChangeWorkspaceFolders( async () => {
		await vscode.commands.executeCommand(extensionFunctions.RELOAD_DIDACT_COMMAND);
	});

	// set up so we don't lose the webview contents each time it goes 'invisible' 
	vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, new DidactPanelSerializer(context));

	// register the default tutorials if the setting is set to true
	const installTutorialsAtStartup : boolean = getAutoInstallDefaultTutorialsSetting();
	if (installTutorialsAtStartup) {
		// register the default tutorial
		const tutorialUri = vscode.Uri.file(context.asAbsolutePath('./demos/markdown/didact-demo.didact.md'));
		await registerTutorialWithCategory(DEFAULT_TUTORIAL_NAME, tutorialUri.fsPath, DEFAULT_TUTORIAL_CATEGORY);

		// register the tutorial for creating a new extension with a didact file
		const tutorial2Uri = vscode.Uri.file(context.asAbsolutePath('./create_extension/create-new-tutorial-with-extension.didact.md'));
		await registerTutorialWithCategory("Create a New Didact Tutorial Extension", tutorial2Uri.fsPath, DEFAULT_TUTORIAL_CATEGORY);

		// register the javascript tutorial (now updated with time details)
		const tutorial3Uri = vscode.Uri.file(context.asAbsolutePath('./demos/markdown/helloJS/helloJS.didact.md'));
		await registerTutorialWithCategory("HelloWorld with JavaScript in Three Steps", tutorial3Uri.fsPath, DEFAULT_TUTORIAL_CATEGORY);

		// register the didact tutorial
		const tutorial4Uri = vscode.Uri.file(context.asAbsolutePath('./demos/markdown/tutorial/tutorial.didact.md'));
		await registerTutorialWithCategory("Writing Your First Didact Tutorial", tutorial4Uri.fsPath, DEFAULT_TUTORIAL_CATEGORY);
	}

	// create the view
	createIntegrationsView();

	// open at startup if setting is true
	const openAtStartup : boolean = getOpenAtStartupSetting();
	if (openAtStartup) {
		await extensionFunctions.openDidactWithDefault();
	}
}

function createIntegrationsView(): void {
	didactTreeView = vscode.window.createTreeView(DIDACT_VIEW, {
		treeDataProvider: didactTutorialsProvider
	});
	didactTreeView.onDidChangeVisibility(() => {
		if (didactTreeView.visible === true) {
			didactTutorialsProvider.refresh();
		}
	});
}

export async function deactivate(): Promise<void> {
	clearOutputChannels();
}

export function refreshTreeview(): void {
	if (didactTreeView && didactTreeView.visible === true) {
		didactTutorialsProvider.refresh();
	}
}

export async function revealTreeItem(node: SimpleNode | null | undefined) : Promise<void> {
	await vscode.commands.executeCommand('didact.tutorials.focus'); // open the tutorials view
	if (didactTreeView && didactTreeView.visible === true && node) {
		await didactTreeView.reveal(node, {expand : true});
	}
}
