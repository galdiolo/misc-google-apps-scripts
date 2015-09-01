#Miscellaneous Google Apps Scripts (and Snippets)

##GoogleDoc-to-simple-HTML.gs

I had been using a snippet found in the web to convert simple Google Drive documents to HTML for later conversion to e-books. As soon as I started adding bullets and other features it failed really quickly.

This one works pretty well (so far). What it supports:

 * Tables
 * Headings & Paragraphs (with alignment)
 * Lists (ordered and unordered)
 * Horizontal Rules
 * Links
 * Direct tags*

*Direct tags are what I call inline HTML in the Google doc - eg: you can type <img src="links/image.png" alt="Yep" style="float:left;width:45%" /> directly into the Google Doc.

What it does not support:

 * Inline Images
 * I think tables embedded in list cause an issue (or not).
 
In this script I added a menu to save the current document as HTML, Enjoy.