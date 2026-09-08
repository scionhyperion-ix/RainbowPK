# Rainbow for PluralKit

Rainbow is a browser-based alternative interface for PluralKit.

It lets you connect your own PluralKit system, view current fronters, create switches, manage co-fronting, edit members, and review front history from a simple web interface.

No Rainbow account is required.

## Important

Rainbow uses your PluralKit system token to access your system.

Your PluralKit token is extremely sensitive. Anyone who has your token may be able to view or modify your PluralKit system.

Never send your token to another person, post it publicly, commit it to GitHub, or enter it into a website you do not trust.

Only use Rainbow from the official link provided by the project owner or from a copy of the source code that you trust.

## Getting Your PluralKit Token

You need a PluralKit system token before you can sign in.

In a Discord server or DM where PluralKit is available, send:

```text
pk;token
```

PluralKit should send your token to you privately.

Copy the token, then return to Rainbow.

Do not share the token with anyone else.

## Signing In

1. Open Rainbow.
2. Paste your PluralKit token into the token field.
3. Choose whether you want Rainbow to keep you signed in on this browser.
4. Select **Log in**.
5. Rainbow will ask the PluralKit API which system belongs to the token.
6. If the token is valid, your system dashboard will open.

There is no separate Rainbow username, password, or account.

Your PluralKit token is your login credential.

## Keep Me Signed In

Rainbow can remember your login on the current browser.

If **Keep me signed in** is turned off, the token is stored only for the current browser session.

If **Keep me signed in** is turned on, the browser stores the token locally so Rainbow can restore your login later.

Only use the remember option on a device and browser that you trust.

Do not use it on public, school, workplace, library, hotel, or shared computers.

## Signing Out

Use **Sign out** in Rainbow when you are finished.

Signing out removes Rainbow's saved copy of the token from the browser.

If you are using a shared device, always sign out before leaving it.

## Dashboard

After signing in, the dashboard shows information from your PluralKit system.

Depending on your system and current activity, you may see:

* Your system information
* Current fronters
* How long the current front has been active
* Frequently fronting members
* Recent switches
* Member information

Rainbow reads this information directly from PluralKit.

## Current Front

The Current Front section shows the member or members who are currently marked as fronting in PluralKit.

If several members are fronting together, Rainbow can display them as co-fronters.

Changes made in Rainbow are sent to PluralKit, so they can also appear in other applications that use your PluralKit data.

## Quick Front

Quick Front is intended for fast switching.

Select a member from the available or frequently used members to create a new PluralKit switch.

Depending on the action you choose, you can:

* Replace the current fronter
* Add another member as a co-fronter
* Start a new switch
* Switch everyone out

Always check the selected members before confirming a switch.

## Replace Current Front

Use **Replace current** when the selected member or members should become the new current front.

This creates a new switch in PluralKit using the members you selected.

## Add Co-fronter

Use **Add co-fronter** when someone should be added without removing the member or members who are already fronting.

For example:

```text
Current front:
Alex

Add co-fronter:
Jamie

New front:
Alex + Jamie
```

## Switch Out

Use **Switch out** when nobody should currently be recorded as fronting.

This creates an empty switch in PluralKit.

## Custom Switch Time

Rainbow can let you set the start time of a switch.

Use this when you are entering a switch that happened earlier rather than starting it at the current time.

Check the date and time carefully before saving it.

## Members

The Members section shows members from your PluralKit system.

You can search for members and open their profiles.

Depending on the current Rainbow version, editable fields may include:

* Name
* Display name
* Pronouns
* Description
* Color
* Birthday
* Avatar URL

Saving a change updates the member in PluralKit.

## Creating a Member

Use **Create member** to add a new member to your PluralKit system.

Fill in the required information, review it, then save.

The new member is created directly in PluralKit.

## Editing a Member

1. Open **Members**.
2. Search for or select the member.
3. Change the fields you want to update.
4. Select **Save**.
5. Wait for Rainbow to confirm that the update succeeded.

If an update fails, check the error message before trying again.

Avoid repeatedly pressing Save while a request is still being processed.

## Front History

The Front History section shows recorded PluralKit switches.

You can use it to review previous fronting sessions.

Depending on the entry, Rainbow may allow you to:

* Change the members in a switch
* Correct the switch timestamp
* Remove an incorrect switch

Edits made here change your actual PluralKit switch history.

## Editing a Switch

Open the switch you want to correct.

Confirm that you selected the correct history entry before changing anything.

You may be able to update:

* Which members were fronting
* The start date
* The start time

Save the changes when finished.

## Deleting a Switch

Deleting a switch removes that switch entry from your PluralKit history.

Only delete an entry if you are sure it is incorrect or no longer needed.

Deletion may not be reversible from Rainbow.

## Where Your Data Goes

Rainbow is a static website.

The normal data flow is:

```text
Your browser
    |
    | Your PluralKit token
    | PluralKit API requests
    v
PluralKit
```

Rainbow does not require its own user database.

Your members, switches, and system information remain stored by PluralKit.

The public GitHub repository does not contain your personal token.

## Token Privacy

Rainbow does not include a user's PluralKit token inside its public source code.

Each person who opens the site must use their own token.

For example:

```text
Person A opens Rainbow
        |
        v
Person A enters Person A's token
        |
        v
Person A sees Person A's system


Person B opens the same Rainbow site
        |
        v
Person B enters Person B's token
        |
        v
Person B sees Person B's system
```

Person B does not automatically receive access to Person A's system.

## If Your Token May Have Been Exposed

Treat a PluralKit token like a password.

If you accidentally post it publicly, send it to another person, commit it to a repository, or believe someone else obtained it, refresh the token through PluralKit as soon as possible.

You can generate a replacement token using PluralKit.

After replacing it, sign in to Rainbow again using the new token.

The old token should no longer be used.

## Shared Computers

Rainbow is not intended to keep you safely signed in on an untrusted shared computer.

If you must use a shared device:

1. Do not enable **Keep me signed in**.
2. Sign out when finished.
3. Close the browser.
4. Clear site data if appropriate.
5. Never allow the browser or a password manager you do not control to save your token.

Using your own device is strongly recommended.

## Does Rainbow Know My Discord Password?

No.

Rainbow does not need your Discord password.

Do not enter your Discord password into Rainbow.

Rainbow only needs the PluralKit system token that you obtain through PluralKit.

## Does Rainbow Need My Discord Account?

Rainbow communicates with the PluralKit API using your PluralKit token.

You do not sign in to Rainbow with a Discord username and password.

## Can Another Rainbow User See My System?

Not simply because they use the same website.

Each browser session must provide a valid PluralKit token.

A user with their own token accesses their own PluralKit system.

Someone who obtains your token may be able to access your system, which is why the token must stay private.

## Does Rainbow Create a Separate Copy of My System?

No.

PluralKit remains the main source of system data.

When Rainbow loads your members or front history, it requests that information from PluralKit.

When Rainbow edits a member or creates a switch, the change is sent back to PluralKit.

## Will Changes Appear in PluralKit Elsewhere?

Generally, yes.

Because Rainbow modifies the PluralKit data itself, changes can also appear through PluralKit's Discord bot, dashboard, or other clients that read the same system information.

## Why Am I Getting an Invalid Token Message?

Possible reasons include:

* The token was copied incorrectly
* Spaces or extra characters were included
* The token was refreshed and the old token no longer works
* PluralKit is temporarily unavailable
* Your network is blocking the request

Try copying your current token again and signing in.

Never send your token to another person for troubleshooting.

## Rainbow Cannot Connect to PluralKit

Check:

1. Your internet connection.
2. Whether PluralKit is currently available.
3. Whether your token is still valid.
4. Whether your browser is blocking the request.
5. Whether a privacy extension or network filter is interfering with the PluralKit API.

Try refreshing Rainbow after checking these items.

## My Members Are Not Showing

Try refreshing the member list or reloading Rainbow.

If the problem continues, confirm that the members exist in the same PluralKit system connected to your current token.

## A Switch Has the Wrong Time

Open **Front History**, select the affected switch, and edit its timestamp if the current Rainbow version provides that option.

Be careful with time zones when correcting old entries.

## I Fronted the Wrong Member by Accident

Open **Front History** and correct the most recent switch.

You can change its members or remove the incorrect switch if necessary.

## Can I Use Rainbow on My Phone?

Yes.

Rainbow is designed to work on desktop and mobile browsers.

Your browser must support the features Rainbow uses and be able to connect to the PluralKit API.

## Can I Use More Than One System?

Rainbow connects to whichever PluralKit system owns the token you entered.

To use another system:

1. Sign out.
2. Enter the other system's token.
3. Sign in again.

Never mix or share system tokens.

## Can I Share the Rainbow Website?

Yes.

You can share the public Rainbow website URL with anyone.

Do not share your PluralKit token.

Other users should open the site and enter their own tokens.

For example:

```text
Share this:

https://scionhyperion-ix.github.io/RainbowPK/

Do not share this:

Your PluralKit token
```

## Can I Bookmark Rainbow?

Yes.

Bookmark the public site URL.

Rainbow should never place your token in the page URL.

## Security Reminders

* Treat your PluralKit token like a password.
* Never post your token publicly.
* Never put your token in screenshots.
* Never send your token to Rainbow developers for support.
* Never commit your token to GitHub.
* Never store your token in a public file.
* Do not use the remember option on shared devices.
* Sign out when using a device you do not fully control.
* Replace your token if you believe it was exposed.
* Check that you are using the correct Rainbow website before entering your token.

## For Support

If Rainbow behaves incorrectly, describe the problem without sharing your PluralKit token.

Useful information can include:

* What page you were using
* What action you selected
* What error message appeared
* Your browser name and version
* Whether you are on desktop or mobile
* Steps that reproduce the problem

Never include your token in a bug report, screenshot, issue, or support message.

## Self-hosting

You can also host Rainbow on another static hosting provider.

Examples include:

* GitHub Pages
* Cloudflare Pages
* Netlify
* Vercel
* A personal web server

No server-side database is required for the basic Rainbow client.

## Privacy Notes

Rainbow communicates directly between your browser and PluralKit.

The public Rainbow website does not need to maintain its own database of systems.

However, anything stored in your browser can potentially be accessed by someone who has access to that browser profile or by malicious code running on the same website origin.

Only use Rainbow from a source you trust.

## Open Source

Rainbow can be published as an open source project.

This allows users to inspect the source code and see how their PluralKit token is handled before signing in.

If you modify Rainbow and publish your own version, do not add:

* Personal PluralKit tokens
* Private system exports
* Hard-coded authentication credentials
* Other users' private information

## Credits

Rainbow uses the PluralKit API to read and update PluralKit system data.

PluralKit is a separate project and service.

Rainbow is an alternative client and is not the PluralKit Discord bot itself.

## Disclaimer

Rainbow is an independent client built to interact with PluralKit.

It is not an official PluralKit application unless explicitly stated otherwise by PluralKit.

PluralKit's API, service availability, features, and policies may change independently of Rainbow.

## Final Reminder

Your token belongs to you.

Share the Rainbow website if you want to.

Do not share your token.

Every user should sign in with their own PluralKit token.
