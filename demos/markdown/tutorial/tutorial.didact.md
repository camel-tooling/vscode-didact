![Writing Your First Didact Tutorial](images/header.png){.imageCenter}

# Welcome!

This Didact tutorial uses Didact itself to help you create your first Didact tutorial!

## What is Didact?

Didact is a framework that fills a need for a more active kind of tutorial or click-through document in VS Code.

Do you find yourself writing documents for yourself or others filled with steps to accomplish various tasks? Do you write them in Markdown or AsciiDoc for easier formatting to share them with others? Do you find yourself wishing they could do more than be just static repositories full of chunks of text to copy and paste in various ways?

Didact gives you a way of writing those same files but gives them a way to leverage commands in VS Code to do a lot more than copy and paste!

## Getting Started with Didact

1. Install Microsoft Visual Studio Code (you already have this!) [Visual Studio Code website](https://code.visualstudio.com/)
2. Add the [vscode-didact extension](vscode:extension/redhat.vscode-didact) (you already have this too if you're seeing the tutorial in the `Didact Tutorials` view!)
3. Create a new AsciiDoc or Markdown file and add “didact” to the file extension (`myfile.didact.adoc`, `myotherfile.didact.md`) [(Click here to create your first Didact markdown file named `myfirst.didact.md`.)](didact://?commandId=vscode.didact.scaffoldProject&extFilePath=redhat.vscode-didact/demos/markdown/tutorial/didactmdfile.json) [(Then click here to open the new `myfirst.didact.md` file.)](didact://?commandId=vscode.open&projectFilePath=didactmdfile.json)
4. Start writing!
5. When you get to a point where you want the user to click on a link to do something active, write a Didact link (we'll cover that in the next section).
6. To open and test your Didact file, right-click on the file and select `Start Didact Tutorial from File` from the context menu or launch the Didact window while editing the file with `Ctrl+Shift+V` or `Cmd+Shift+V`.
6. Repeat steps 4-6 until you’re done!

## The Basics of Didact

Didact is as simple as writing a Markdown or AsciiDoc document and adding some cool links to get it to do things. The links have a unique format and enable you to utilize the Commands defined to work inside VS Code. [(Be sure to check out the VS Code documentation online for a deep dive into Commands.)](https://code.visualstudio.com/api/extension-guides/command). But if you can do those two things, you have everything you need to be successful writing Didact tutorials.

There are other things we can do too, but we'll cover those in a bit. 

![Creating a Didact Link](images/didact-link-header.png){.imageCenter}

## Starting Simple

Let's start with something simple. Perhaps you want to execute a command at the command line and print out some text with an echo command. 

Well, today's your lucky day! VS Code not only has built-in Terminal windows that we can use, but we can execute a command with a click with a Didact link!

For instance, if we want to do something like `echo Didact is fantastic!`, we could!

> Note: If your new Didact file and this tutorial are overlapping, move this tutorial somewhere (above/below, left/right) in the VS Code IDE so you can keep it somewhere easy to see while you edit your other file.

> Also Note: Links in Markdown files appear in the format `[link text](url)`, so if you're unsure how to start your link, you might type `[Send some fantastic text to a Terminal window!]()`.

In your editor where you want to put the link (between the parentheses, for example), hit Ctrl+Space, select `Start a new Didact link`, and choose `Send Named Terminal Some Text`. You are given some templated text you can quickly modify for your use.

* The terminal name defaults to `TerminalName`.
* And you see a field named `URLEncodedTextToSendTerminal`

Any time you need to send text to a command and it involves fancy formatting (i.e. spaces, slashes, etc) you will need to encode it so it works in a URI/URL. Our command line `echo Didact is fantastic!` becomes `echo+Didact+is+fantastic%21`.

> Note: If you use a URL Encoder like [Url Encode Online](https://www.urlencoder.io/), you can simply copy the text you want to encode into it, let it work its magic, and copy the results back into your Didact URL. 

So your Didact link might look like:

```
[Send some fantastic text to a Terminal window!](didact://?commandId=vscode.didact.sendNamedTerminalAString&text=TerminalName$$echo+Didact+is+fantastic%21)
```

Try it and if you get stuck, [click here](didact://?commandId=vscode.didact.copyToClipboardCommand&text=%5BSend%20some%20fantastic%20text%20to%20a%20Terminal%20window%21%5D%28didact%3A%2F%2F%3FcommandId%3Dvscode.didact.sendNamedTerminalAString%26text%3DTerminalName%2524%2524echo%2BDidact%2Bis%2Bfantastic%2521%29) to put the text above on the clipboard and paste it into your Markdown file.

![Adding Requirements Checking](images/requirements-checking-header.png){.imageCenter}

## Requirements Checking

In order to use commands at the command line, often you want to ensure that the user is primed for success. To do that, we can actually check their system to make sure things are installed before they get going.

For example:

* Maybe we want to make sure the user has a particular VS Code extension pre-installed… 
* Maybe we want to make sure the user has the Camel K or OpenShift CLI tools installed and ready…
* Maybe we want to check to see if a component is set up in the user’s kubernetes cluster…

Whatever we're checking, Didact likely has a way to make it work. And there's a two-step process:

1. Create a label for the requirements result pass/fail
2. Do the check and tie it to the label

An easy way to structure these status lines and requirements checks places all requirements checking in a section of the document and each requirement as a subsection. The example below tests to see if a command (`kubectl`) exists on the command line. 

```
## Requirements

<a href='didact://?commandId=vscode.didact.validateAllRequirements' title='Validate all requirements!'><button>Validate all Requirements at Once!</button></a>

**Kubectl CLI**

The Kubernetes `kubectl` CLI tool will be used to interact with the Kubernetes cluster.

[Check if the Kubectl CLI is installed](didact://?commandId=vscode.didact.cliCommandSuccessful&text=kubectl-requirements-status$$kubectl%20help "Tests to see if `kubectl help` returns a 0 return code"){.didact}

*Status: unknown*{#kubectl-requirements-status}
```

Let's walk through the parts of this example.

### Adding a Requirements Label

Essentially the *Status* label is a textual placeholder for a success or failure message based on the requirement status. We have another type-ahead helper to help you create one.

* Ctrl+Space, select `Insert Didact Requirements label` and then make the hashtag label specific for your requirement.
* Example: `*Status: unknown*{#requirement-name}`

Then you have to decide what kind of requirement it is you’re checking and how specific you want to get.

### Simple Command-line Resource Checking

Like with all Didact links (and links in general), the requirement check itself is in the format `[link text](link url)`. If it’s a really simple command-line check and you just want to make sure it executes without errors (return code 0), you need the requirement label and the command line to try with `vscode.didact.cliCommandSuccessful` as we did with the `kubectl` example above.

* Ctrl+Space, select `Start a new Didact link`, and `Check CLI for Success (No Text)`, update the requirements label to use and the URL-encoded CLI text
* Example to see if `mvn` is available in the system path: `didact://?commandId=vscode.didact.cliCommandSuccessful&text=maven-requirements-status$$mvn%20--version`

### Checking all your requirements at once

As you saw in the example above, you can even add a button to validate ALL requirements check Didact finds in a particular document at once. Like with inserting a requirement label, we’ve created a shortcut for you:

* Ctrl+Space, select `Insert Validate All button` and then change the label for your button if you need to.
* Example button: `<a href='didact://?commandId=vscode.didact.validateAllRequirements' title='Validate all requirements!'><button>Validate all Requirements at Once!</button></a>`

![Additional Didact Capabilities](images/additional-capabilities-header.png){.imageCenter}

## But wait, there's more!

Here are a few ideas for you to explore what else Didact has to offer:

* Use one of the other types of requirements checks. You can see an example [here](https://raw.githubusercontent.com/redhat-developer/vscode-didact/master/examples/requirements.example.didact.md) that walks through all the current options.

* Put all your requirements in a table for easier parsing. You can see an example [here](https://github.com/redhat-developer/vscode-didact/blob/master/demos/markdown/dep-table.didact.md).

>If you use Markdown, there’s a helpful utility that can help you create a table: [TablesGenerator.com](http://www.tablesgenerator.com/markdown_tables).

* Leverage other VS Code commands! every `didact://` command starts with a command id. Commands serve as the backbone to everything in VS Code and there are a BAZILLION of them. Check out this [table](https://github.com/redhat-developer/vscode-didact/blob/master/examples/commands.reference.md) we pulled together of Didact and other commands as examples.

## Providing Feedback

If you have questions or run into scenarios where it would be helpful to have a Didact-specific solution, please drop us an issue in the [Didact Github repository](https://github.com/redhat-developer/vscode-didact)! 

Thanks!
