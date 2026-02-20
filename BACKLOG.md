## Vision

An AI-powered writing and worldbuilding tool.

Heavily inspired by code editors (refactors, rename, etc.)



## Features

A braindump page - you type everything in. Then, extract things to pages, either manually or with AI (e.g. ask AI to create a document for a character)

Extract - highlight text and specify what to extract. The AI will generate a page for that concept (person, place, etc), move all descriptions there, and replace with a link.

NER - use BERT to identify proper nouns. Then, link to existing pages using fuzzy matching and/or LLMs/reranker. Offer to create pages if nothing can be found. 
NER data sits as a separate "layer" for the input.

Versioning - a basic git-style version system. Each file is versioned with a hash. a new checkpoint is automatically created whenever running AI. 
> We will need to implement an efficient way to store versions. Storing hundreds of copies of each file is maybe a bad idea (but IndexedDB can probably handle it)

A search tool, which will trace links and 
