import * as assert from 'assert';
import {getRegisteredTutorials, getDidactCategories, getTutorialsForCategory, getUriForDidactNameAndCategory, registerTutorialWithCategory, clearRegisteredTutorials, registerTutorialWithArgs, DIDACT_APPEND_REGISTERED_SETTING, getAppendRegisteredSettingFromEnv, appendAdditionalTutorialsFromEnv} from '../../utils';
import {before} from 'mocha';
import * as vscode from 'vscode';
import { ADD_TUTORIAL_TO_REGISTRY, getContext, REGISTER_TUTORIAL } from '../../extensionFunctions';
import { DEFAULT_TUTORIAL_CATEGORY, DEFAULT_TUTORIAL_NAME, didactTreeView } from '../../extension';

const name = 'new-tutorial';
const category = 'some-category';
const source = 'my-uri';
const name2 = 'new-tutorial-2';
const category2 = 'some-category-2';
const source2 = 'my-uri-2';
const name3 = 'new-tutorial-3';
const category3 = 'some-category-3';
const source3 = 'my-uri-3';

suite('Didact registry test suite', () => {

	before('Clear the registry tests', async () => {
		await clearRegisteredTutorials(false);
	});

	test('assert that clearing the registry made it empty', async () => {
		const registry = getRegisteredTutorials();
		assert.strictEqual(registry, undefined, `Registry was expected undefined but got ${registry}`);

		// clean up and add one demo tutorial back in
		const tutorialUri = vscode.Uri.file(getContext().asAbsolutePath('./demos/markdown/didact-demo.didact.md'));
		await registerTutorialWithCategory(DEFAULT_TUTORIAL_NAME, tutorialUri.fsPath, DEFAULT_TUTORIAL_CATEGORY, true);

		const addRegistry = getRegisteredTutorials();
		assert.notStrictEqual(addRegistry, undefined, `Registry was expected not to be undefined`);
	});

	test('Add to registry without setting focus', async() => {
		await clearRegisteredTutorials(false);
		const selectedTutorialsBeforeTest = didactTreeView.selection;
		assert.strictEqual(selectedTutorialsBeforeTest.length, 0, `There are unexpected selected Tutorials before test: ${selectedTutorialsBeforeTest}`);
		
		try {
			await registerTutorialWithArgs(name3, source3, category3);
		} catch(error) {
			assert.fail('We failed to create the new didact registry entry');
		}
		
		const selectedTutorials = didactTreeView.selection;
		assert.strictEqual(selectedTutorials.length, 0, `There are unexpected selected Tutorials: ${selectedTutorials}`);
	});
	
	test('add to registry', async () => {
		try {
			await registerTutorialWithArgs(name, source, category, true).then( () => {
				assert.ok('No errors thrown while creating new didact registry entry');
			});
		} catch (error) {
			assert.fail('We failed to create the new didact registry entry');
		}
		
		const selectedTutorials = didactTreeView.selection;
		assert.strictEqual(selectedTutorials.length, 1, `There are unexpected selected Tutorials: ${selectedTutorials}`);
		assert.strictEqual(selectedTutorials[0].label, name);

		try {
			await registerTutorialWithCategory(name, source, category);
			assert.fail('Should have been an error thrown while creating new didact registry entry twice');
		} catch (error) {
			assert.ok('As expected, we failed to create the new didact registry entry with a duplicated entry');
		}
	});

	test('make sure we get the registry', async() => {
		const registry = getRegisteredTutorials();
		assert.notStrictEqual(registry, undefined);
	});

	test('verify can get categories', async () => {
		try {
			await registerTutorialWithCategory(name2, source2, category2);
			assert.ok('No errors thrown while creating new didact registry entry for second category');
		} catch (error) {
			assert.fail('We failed to create the new didact registry entry for second category');
		}

		const cats : string[] = getDidactCategories();
		assert.notStrictEqual(cats.indexOf(category), -1);
		assert.notStrictEqual(cats.indexOf(category2), -1);
	});

	test('verify can get tutorials for category', async () => {
		const tuts : string[] = getTutorialsForCategory(category2);
		assert.notStrictEqual(tuts.indexOf(name2), -1);
	});

	test('verify can get uri for name/category pair', async () => {
		const rtnUri : string | undefined = getUriForDidactNameAndCategory(name, category);
		assert.strictEqual(rtnUri, source);
	});

	test('call command to register tutorial', async() => {
		const name3 = 'new-tutorial-3';
		const category3 = 'some-category-3';
		const source3 = 'my-uri-3';
		
		try {
			await vscode.commands.executeCommand(REGISTER_TUTORIAL, name3, source3, category3).then( () => {
				assert.ok('Registered via command');
				return;
			});
		} catch (error) {
			assert.fail('Failed to register via command: ' + error);
		}

		const foundTutorial = verifyTutorialInRegistry(name3);
		assert.ok(foundTutorial, `Did not find new-tutorial-3 registered via JSON`);

	});

	test('call command to register tutorial via json', async() => {
		const name4 = 'new-tutorial-4';
		const category4 = 'some-category-4';
		const source4 = 'my-uri-4';

		const tutorialJson:JSON = <JSON><unknown>{
			"name" : `${name4}`,
			"category" : `${category4}`,
			"sourceUri" : `${source4}`,
		};
		
		try {
			await vscode.commands.executeCommand(ADD_TUTORIAL_TO_REGISTRY, tutorialJson);
		} catch (error) {
			assert.fail('Failed to register via json: ' + error);
		}

		const foundTutorial = verifyTutorialInRegistry(name4);
		assert.ok(foundTutorial, `Did not find new-tutorial-4 registered via JSON`);
	});

	test('append registry from environment variable', async() => {
		const tutsToAppend = '[{"name":"AppendMe2","category":"AppendedCat2","sourceUri":"https%3A%2F%2Fraw.githubusercontent.com%2Fredhat-developer%2Fvscode-didact%2Fmain%2Fexamples%2Fregistry.example.didact.md"}]';
		process.env[DIDACT_APPEND_REGISTERED_SETTING] = tutsToAppend.toString();

		const envVarJson = getAppendRegisteredSettingFromEnv();
		console.log(`envVar = ` + envVarJson);
		assert.ok(envVarJson, `Did not find envVarJson`);

		const registry = getRegisteredTutorials();
		assert.notStrictEqual(registry, undefined);

		const tutName = `AppendMe2`;
		await appendAdditionalTutorialsFromEnv();
		const foundTutorial = verifyTutorialInRegistry(tutName);
		delete process.env.DIDACT_APPEND_REGISTERED_SETTING;
		assert.ok(foundTutorial, `Did not find ${tutName} registered after appending to tutorial list from settings`);
	});

	test('Clear all the tutorials', async() => {
		const registry = getRegisteredTutorials();
		assert.notStrictEqual(registry, undefined);

		await clearRegisteredTutorials(false);

		const afterregistry = getRegisteredTutorials();
		assert.deepStrictEqual(afterregistry, undefined);
	});
});

function verifyTutorialInRegistry(nameToTest : string) : boolean {
	const existingRegistry : string[] | undefined = getRegisteredTutorials();
	if (existingRegistry) {
		for (const entry of existingRegistry) {
			const jsonObj : any = JSON.parse(entry);
			if (jsonObj && jsonObj.name && jsonObj.category) {
				const testName = jsonObj.name.toLowerCase() === nameToTest.toLowerCase();
				if (testName) {
					return true;
				}
			}
		}
	}
	return false;
}