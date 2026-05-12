what's up Engineers Indy Dev Dan here in
this video I have six CLA code Pro tips
that will help you achieve asymmetric
Engineering in the generative AI age but
the big theme behind the face value of
this video is that tools like CLA code
mCP and AI coding assistance and agents
enable you to build systems that build
systems for you this is the advantage
you and I have as Engineers Vibe coding
is the lowest hanging fruit system
building enables you to reuse the value
you create over and over and over so
with this lens let me share my top six
claw code tips for a gentic coding you
can use to accelerate your Engineering
in the Gen AI
[Applause]
age the CLA code team is shipping in the
shadows let's cover some of their new
releases and a few techniques you can
use to ship faster than ever let's start
with one of my new favorite techniques
context priming let's open up cursor and
let's fire off CLA you can see I have
five mCP servers we're going to cover a
few of those in this video but first
what is context priming how can it help
you use cloud code in a more efficient
effective way when you first startup CLA
it's effectively an empty agent it
doesn't see what you see it can't see
your code base it doesn't know what you
know it's basically a blank page it's a
blank agent we need to let it know what
you're working on I've started adding
this inside of all of my readmes if we
open up the readme and search for
context priming you can see I have this
simple prompt let's copy this and paste
it in the Claude And Fire it off this is
going to let Claude read the essential
files of the code base and then run get
LS files to understand the code base you
can see here the cloud code Engineers
have implemented a couple new awesome
features we're doing parallel reads with
this cool sub agent call tool all these
items are now getting added to Cloud
codes context window at application
startup you can see here it's giving us
a nice summary but most importantly it
now has this information inside of its
context window if we type SL cost you
can see there of course this is not a
cheap tool right you're going to have to
pay to play with Cloud code but you can
see here you know we've done some
operations already we have 40 cents
worth of work that is now context AKA
active memory for CLA code this lets you
set up your AI coding assistant to win
right away by downloading the Essential
Elements of your code base I highly
recommend you add something like this to
your read me so that you can get started
quickly when you have to reset your
Cloud code instances when you're nearing
that 200k context token window limit as
you'll see here in a moment when we run
an AI coding prompt this small tweak
speeds up your work quite a bit if we
run get LS files you know we can now see
a general structure of the code base I
also like to run tree sometimes and pass
that into claw and so as you can see
here we are operating in the single file
agents code base this is something we've
worked on on the Channel all the work
we're doing here is going to be
available to you link in the description
we're using UV to build out these
powerful single file agents again we're
going to look at these in just a moment
here that's tip number one let's move on
to tip number two context is King this
is not new if you've been working in the
AI coding space and if you've been
working with language models you always
want to be feeding claw code and your AI
coding tools the context it needs to get
the job done if we type slash mCP here
you can see I have five mCP servers in
this current project the winning
engineers in the Gen AI age will always
be thinking from the perspective of
their AI agents what can they see if
someone were to prompt me with this
context and this tool would I be able to
accomplish the task having the right
tools and the right mCP servers gives
your Cloud code instances what it needs
to succeed I think of mCP servers and
tools in two classes we have collectors
and we have executors first you collect
contacts with your collectors and then
you execute crud operations right you
update files you update databases you
operate on information you have
collectors and you have executors right
now I have two primary tools for
collection I use the out of the box
fetch tool right from the anthropic
servers and I also use fir craw mCP fir
crawl is a simple tool I'm not sponsored
by them or anything but they are my
recommendation if you want to scrape and
crawl single websites if you want to
extract key information and also if you
want to Traverse multiple Pages they
also help you get around some of the SSR
and server rendering issues and blocking
that tools like fetch are limited by
let's go ahead and take a look at the
new file editor agent us using Sonet 3.7
this is really cool this is a new simple
file editing agent that can edit files
using the brand new text editor for 3.7
Sonet specifically this is a brand new
text editor tool that enables you to
build agents that can edit files
precisely this is a massively important
tool for agents this is a great example
of an Executor tool and so we have this
brand new tool inside of this agent we
can do something like this I can just
copy this we're using UV single file
scripts I'll open up a new terminal
instance here and I'll just say
summarize into a new readme summary. MD
okay so this is a simple file editing
agent it can read and write and let's go
ahead and full screen this you can see
we're calling the view tool here it read
the read me it has those 20 lines and
now it's written that file so with three
agent loops and really just two it's r a
file and it's created a file and then
it's reported the results you can see
the token output here so now we should
be able to open up this new read me
summary and you can see here we have
that exactly here we have a nice concise
summary of what's been done this is all
built on top of anthropics brand new uh
text editing tool built specifically for
3.7 Sonet anthropic realizes how
important file editing is for building
out you guessed it effective agents so
there's a new additional feature that I
want to add to this agent and thropic
has also shipped this brand new token
efficient tool use beta flag so let's go
ahead and pull this content and add this
to our existing agent so instead of you
know shipping this previous command
let's go ahead and copy this out we want
to be able to copy this efficiency okay
and then this will run with the beta
flag so this is a single page so it's
really simple normally you could just
copy this but I want to show off how
important it is to have these tools
embedded in clog code let's say we
needed a couple pages of documentation
right what I'll do here is I'll just
copy this open up a new file paste that
there and then copy this URL as well
paste that there and then I'll write a
prompt right in this file fetch combine
and then do this right so I'm going to
copy this and we have our fetch tool
inside of CLA code mCP so now we can
just paste and let this fire off so this
is going to run fetch on both these and
it's going to create a new mark on
document we've talked about this in
previous videos but I want to highlight
this one more time it's super super
important to think of your tools as
collectors and executors and so you can
see here we have Cloud code's new
parallel run subtask just ran both of
those at the same time it's now looping
through the actual content and it's
going to create a new file so let's go
ahead and look at our AI docs you can
see we have several docs in here already
and this is going to create a new
markdown document for us with this
content uh collected
automatically fantastic we're going to
go into YOLO mode we want CLA code
operating in its full agentic form we'll
hit yes and you can see this new
document added here it has both the tool
use docks and the efficient tool use
combined so this is great right now that
we have collected the context for this
we can go ahead and write a follow-up AI
coding prompt to update our existing
single file a agent file editor with the
new Sonic 3.7 file editing tool and we
can have it update to actually use Let
Me Go a and collaps everything so you
can see what we have here you can see
all the file editing tools and we can go
ahead and update this to uh use the new
flag right so let's go ahead and do that
I'm going to use my uh file reference
hotkey for me it's command shift R I
highly recommend you set this I'm going
to paste that in and then I'll say
update via a D- efficiency flag so we're
going to kick that off you know to be
super clear we don't need to reread this
file because it is in fact already in
the context window right Claud just
wrote that so it has it in its context
window you always want to be thinking
from your agent's perspective you can
see it's running the read tool here
right to and create a flask API with
three end points with the efficiency
token flag there we're also passing in
the thinking tokens and Max compute
loops and there we go so there's the
code coming in D- efficiency flag that's
looks great let's go ahead and full
screen this so we can watch and looks
like we got a little error here
premature close just going to say
continue the anthropic apis over the
past couple weeks have been absolutely
hammered and you know it's very likely
to the mass adoption of Claude 3.7 Sonet
on top of CLA code I've had many many
many API rate limits um in the past so
okay so this looks great so it looks
like that change got in you can see um
Cloud code summarizing everything that
got changed that looks awesome you can
see the that brand new message args beta
flag so let me give you tip three and
four together we're going to have claw
code uh review and actually execute this
code we've already covered that in
previous videos right we're closing the
loop we're letting our AI coding tools
you know get the feedback it needs by
actually just executing the command but
there's a couple key commands right
inside of claw that you should be aware
of if we type slash relase you can see
that there are release notes now that's
tip three it might seem simple but the
cloud code Engineers are really shipping
in the shadows here and you want to be
keeping track of everything you're
releasing if we hit enter here um I want
to point out something really really
cool that was just released you can say
ask Claud to make a plan with thinking
mode so obviously they're tapping into
Cloud's Hybrid Base reasoning model
capabilities if you say think think
harder or Ultra think you will tap into
these so that's tip number four let's go
ahead and use that tip we just set up
this brand new efficiency Flag by
pulling in this context using an mCP
server here it is here and I'm going to
update this prompt just a little bit
create a flask API with three endpoints
inside of agent workspace yeah sure that
looks good and so now we have this here
it's going to run in efficiency mode and
we're also going to have thinking tokens
what I want to do here is create two
versions right I want this to run uh
without efficiency and with efficiency
so that we can actually see the
difference I'm not going to run this
right there's no reason for me to do
this I'm going to hand this work off to
Cloud code I'm going to hand this work
off to my AI coding tools so I'm going
to copy this and then we're going to
also combine this with a think mode and
so here's what I'll do I'll move over to
our temporary file I'll paste this
command in test out the token efficient
exactly the following command without--
efficiency and then we'll say with and
there we go we're getting some great
Auto completions from cursor Tab and
then what I want to say say here is
record think hard in the review process
okay I'm going to paste this into Cloud
code and then I'm going to fire this off
okay so now it's going to actually run
the agent itself it's going to you know
keep track of the results and then it's
going to run both in efficiency mode and
without efficiency mode okay so you can
see the output of our agent there we had
an issue with our thinking tokens looks
like we're passing in way too many
thinking tokens let's go ahead and drop
that down so so I'm going to drop this
down let's run this at the minimum for
thingy tokens which is 1,024 so I'll
copy and then paste this back in and run
so we're going to kick off the First
Command here running without the
efficiency beta flag there we go so we
can see you know there's the total token
usage there and now we're going to run
with the efficiency flag so you can see
we use a total of you know 5,700 tokens
we just go ahead and copy that out and
we'll just throw this in a file here and
then we'll go ahead and run with
efficiency looks like we're getting a
little error here we're going to go
ahead and let Claude do its thing okay
so you can see here Sonic picking up on
an error that it made it actually um is
using this older syntax where you import
anthropic beta um this is good this is
why we have the documentation there it
can automatically make Corrections when
it needs to so there it is it just made
that change and you can see there yep
nice so we're going to continue down the
line all we want to do is check to see
um if we have that use efficiency token
there there we go we can get rid of that
code that looks great and then uh we're
just going to remove I always like to be
really careful when I look at the you
know any type of RM um but that looks
good we want to remove that one file
that's fine and now we should be in a
good place to rerun yeah let's go ahead
and take a look at this okay so we want
to run without efficiency flag that's
fine it wants to redo the process there
we go so let's go ahead and copy this
value here
right we have uh 6,000 tokens let's go
ahead and update our token value so we
have 6,000 tokens here then it wants to
reset and basically run it again right
with the efficiency flag so let's go
ahead and hit yes and let's see how the
efficiency token flag can save us some
tokens for our
agents so let's take a look um you can
see here Cloud code is giving us a nice
analysis looks like without token of
efficiency we got 6K tokens and width we
got uh 5.7 so not a major you know
saving um but not too bad either right
looks like we got 5.7 uh% reduction and
it looks like the big savings which is
honestly where you want to have the
savings is in the output tokens right
because the output tokens are priced at
I think $15 per million right so this is
really good actually um we want to be
saving on the output token so so this is
an example of how several tips several
techniques can come together right
context is King
you want to be paying attention to what
your AI coding assistant can see what's
actively inside its context window and
then we also looked at the slash relase
so SL relase notes tells you what are
the cloud code Engineers cooking up
right this is super super important we
also then tapped into claud's thinking
tokens right Claude 3.7 reasoning
capabilities so this is super super
powerful so we've now updated our agent
if I search for you know Das Dash
efficiency we can see we have that brand
new efficiency flag that enables you can
see here if use token efficiency we then
add this new cool beta flag right so
that looks great it did save us you know
some five 6% of tokens that will
definitely add up over time all right so
tip number five if I type slash and hit
down a couple times you're going to see
something pretty cool if I scroll to the
bottom you'll see I have a couple of
prompts right so a couple of my mCP
servers have built-in prompts that I can
just run okay so you can see fetch um
has you know the the obvious one that
you would think if I hit enter here it's
going to set up Cloud code to uh have
that Ur that I can pass in right so the
key thing I want to show off here is not
the fetch tool again it's the fact that
you can use these slash commands to
quickly activate one of the prompts if
we look at the model context protocol
servers if we go into fetch again we can
see that there's this prompt right and
this is really cool I think this is a
pretty underused element of mCP servers
you can create predefined prompts where
you have your mCP host pass in specific
variables right so a simple example here
is just fetch right so we type SL Fetch
and this is a prompt that we now have
access to right if we also look at
there's another one here for SQL light
let's hop into something a little bit
newer you can see there's a prompt here
that provides a uh demonstration of how
to use SQL light with mCP right so if we
clear this out and I type mCP you can
see that we do have our you know light
mCP and then I can type SL SQL and you
can see here that exact Command right so
this is a prompt that we can fill in
with variables you can see the argument
there is topic so if I hit uh enter here
whatever sales now it's going to send
back to the SQL light mCP server that we
have installed and it's going to start
setting up some data right so if we
scroll up here it's going to kind of
walk through this scenario walk through
this setup the whole point here is that
mCP servers allow you to tap and into
these different prompts and so that can
be pretty powerful so one more tip I
want to give you here is the fact that
you can add Claude mCP servers very
quickly with Json format so here's where
I like to do this let's go ahead and
close this CLA instance you can see we
spent $3 there and let me go ahead and
run you know Claude mCP list just as an
example let me go ahead and get rid of
fetch so we can say CLA mCP remove fetch
okay so this will remove that and if we
clear run mCP list we'll see that we no
longer have the fetch command there
right if we hop back into Claud I have
an alias for Claud just clld saving a
couple keystrokes uh do/ mCP you can see
our connected mCP servers then if we hop
back into the release notes you'll see
that we can add mCP servers as Json
string so this is a simple but very
useful way to get up and running with
mCP servers inside of cloud code so if I
just copy this open up a new file paste
this in and you know let's get fetch
reinstalled so the name for this is
going to be fetch mCP and then all we
need now is Json how do we set the Json
for this if we open up fetch server
again let's just go back here scroll
down to the uvx we have this command
here right so we can go ahead just copy
this and then we can paste this and then
we need to just clean this up a little
bit so all we need is the content inside
of the actual object okay so we don't
need mCP servers this is for your claw
desktop and we also don't need this kind
of starting key value so we can get rid
of that get rid of the trailing brace
and then we can just use this right so
this is valid Json we can then take this
and paste it here what I like to do here
is run something like this we your
dollar sign PB paste and then this will
take whatever is on our clipboard and
just use that right so we can close
Cloud code here and then paste this
value and then copy whatever Json we
want to use and then hit enter here and
this is going to add that brand new
fetch mCP server just as we defined okay
so now if I type you know CLA mCP
list you're going to see that right here
right Fetch dmcp and then we can run
Claud and you can see here we found 5
mCP servers if I go ahead and type SL
mCP you're going to see that new fetch
mCP server up and running you can
quickly add mCP servers into CLA code
using Json format and they also added
this you know Claud mCP ad um
step-by-step wizard uh that you can also
use so if we clear and run this you can
see that they have a you know setup
command there that you can you know use
to step by-step walk through adding a
new mCP server so obviously I like the
Json approach it's a little bit faster
if you know what you're doing but you
know equally as good you can just come
in here and you know name them whatever
you want you can set up the project
scope these are all you know command
line flags and then you know path to
server so on and so forth right so this
is a nice way to walk through the
process I think the the CLA code team is
really executing here they're creating a
lot of value inside of this tool you
know again it's super important to note
as mentioned in our previous video Cloud
code is saying massive Mass adoption
this tool is really Paving the way for
the next phase of engineering right we
started with you know doing everything
by hand typing code manually we moved to
co-pilots we then started iteratively
writing prompts and you know using AI
coding tools the next big phase is
agentic coding and at the Forefront
really you know the poster child for
this is claw code specifically with 3.7
son it it's a breakthrough tool that's
allowing new capabilities for agented
coding when you combine it with mCP you
can now equip your AI coding assistant
your a gent to coding Tool uh with all
of the capabilities it needs to run not
just programming tasks but to run tools
that allow you to collect and execute
across various domains S as Engineers
it's Ultra important to take advantage
of these tools and focus on Building
Systems that build systems for us where
we're going on the channel and a place I
highly recommend you spend some time
investing is look at what agents you can
build to multiply your productivity to
help you scale up what you can do agents
allow you to scale your impact even
further remember that cloud code itself
is just an agent right it's an agent
agent for engineering it's an agent for
the terminal it's the agent for
engineering a big focus on the channel
is going to be building out agents for
various use cases and understanding
agent design and agent architecture at a
fundamental level if that interests you
join the journey make sure you're
subscribed this is how we scale our
impact and consume more compute to work
on our behalf we're barely scratching
the surface of what we can do with
agents this is are unique Advantage do
not underestimate this it's time to
start Gathering your Suite of tools of
both collection and execution tools so
that you can continue to scale up what
you can do with Incredible AI coding
tools like CLA code these are just five
of you know several mCP servers that I'm
looking at and playing with comment down
below let me know what mCP servers are
your favorites a lot of this will depend
on the tools and the tooling that you
use to engineer you might be using
postgress you might be in Docker a lot
so you'll be using the docker tools
comment down below let me know what
you're using let me know what your
favorite tools are if you made it this
far into the video Drop the like
subscribe join the journey the key here
is to focus on Building Systems that
help you build systems stay focused and
keep building