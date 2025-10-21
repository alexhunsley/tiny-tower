# Tiny Tower

This is a web app for seeing, listening to, and researching change ringing methods.

The live app is at https://hunsley.io/tower.

Tiny Tower is BYOPN (Bring Your Own Place Notation) -- it's not meant for looking up methods. That said, loading some very common methods will probably be added to the interface in the future.

It's in beta (early days).

## Why?

There's a load of blueline websites out there already, each with their strengths and weaknesses.

Hardly any of them let you *listen* to a method.

Here's some other things I've found a bit lacking:

* lightness -- almost all existing sites are monolithic, requiring multiple loads from the server
* selectable/copyable text for the row(s) of a method to clipboard
* quality tools: false method detection, music scoring/marking, anti-music detection (e.g. 87s at back, split tenors)

## Implementation

Tiny Tower is currently written in bare javascript. I may use a lightweight SPA lib at some point (something like Mithril), and possibly Skeleton UI or similar.
