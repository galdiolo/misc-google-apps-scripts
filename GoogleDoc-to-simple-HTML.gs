function onOpen() {
    var ui = DocumentApp.getUi();
    ui.createMenu('Simple HTML')
        .addItem('Save', 'saveAsHTML')
        .addToUi();
}

/**
 * Save the current document as 'simple' HTML.
 */
function saveAsHTML() {
    var document = DocumentApp.getActiveDocument();
    var root = DriveApp.getFileById(document.getId()).getParents().next();
    // Convert the document and wrap a HTML head around it (this was only really designed for the document bodies).
    var content = '<html><head><title>' + document.getName() + '</title></head>' + documentToHTML(document) + '</html>';
    // Format the XML
    var xml = XmlService.parse(content);
    content = XmlService.getCompactFormat()
        .setLineSeparator('\n')
        .setEncoding('UTF-8')
        .setIndent('\t')
        .format(xml);
    // Store it in Drive.
    var htmlname = document.getName() + '.html';
    var existing = root.getFilesByName(htmlname);
    if (existing.hasNext()) {
        existing.next().setContent(content);
    } else {
        root.createFile(htmlname, content, MimeType.HTML);
    }
}

/**
 * Convert a Google doc to HTML.
 *
 * @param {Google Doc} document.
 * @return {String} the document body as HTML
 */
function documentToHTML(document) {
    var result = itemToHTML(document.getBody()).join('');
    // This replaces 'smart' quotes in manually entered tags.
    result = result.replace(/=(“|”)(.*?)(“|”)/g, '="$2"');
    return result;
}

function getHeading(element) {
    if (element && element.getHeading) {
        var heading = 'h1';
        if (DocumentApp.ParagraphHeading.NORMAL == element.getHeading()) {
            heading = 'p';
        } else if (element.getHeading().toString().match('^H.*[0-9]$')) {
            heading = 'h' + element.getHeading().toString().match('.*([0-9])$')[1];
        }
        return heading;
    }
    return null;
}

function itemToHTML(element, listtracker) {
    listtracker = listtracker || {};
    var items = [];
    var type = element.getType();
    var tags = ['<' + type + '>', '</' + type + '>'];
    var heading = getHeading(element);
    if (type == DocumentApp.ElementType.BODY_SECTION) {

        // BODY_SECTION
        tags = ['<body>', '</body>'];

    } else if (type == DocumentApp.ElementType.PARAGRAPH) {

        // PARAGRAPH
        tags[0] = heading;
        var align = element.getAlignment() ? element.getAlignment().toString().toLowerCase() : null;
        tags[1] = '</' + tags[0] + '>';
        tags[0] = '<' + tags[0] + (align ? ' class="' + align + '"' : '') + '>';

    } else if (type == DocumentApp.ElementType.LIST_ITEM) {

        // LIST_ITEM
        var listtype = element.getGlyphType().toString().match('BULL') ? 'ul' : 'ol';
        var open = false;
        var clse = element.isAtDocumentEnd();
        var count = listtracker[element.getListId()] || 0; //stores the amount of times this list has been opened / closed.
        var sib;
        tags = ['<li>', '</li>'];
        if ('p' != heading) {
            tags[0] = tags[0] + '<' + heading + '>';
            tags[1] = '</' + heading + '>' + tags[1];
        }
        if ((sib = element.getPreviousSibling()).getType() == type) {
            if (sib.getNestingLevel() < element.getNestingLevel()) {
                open = true;
            }
        } else {
            open = true;
        }
        if (!clse) {
            if ((sib = element.getNextSibling()).getType() == type) {
                if (sib.getNestingLevel() < element.getNestingLevel()) {
                    clse = true;
                }
            } else {
                clse = true;
            }
        }
        if (open) {
            count++;
            tags[0] = '<' + listtype + '>' + tags[0];
        }
        if (clse) {
            count--;
            tags[1] = tags[1] + '</' + listtype + '>';
            if ((element.isAtDocumentEnd() || element.getNextSibling().getType()) != type && count > 0) {
                for (var i = 0; i < count; i++) {
                    tags[1] = tags[1] + '</' + listtype + '>';
                }
                count = 0; // Reset the count.
            }
        }
        listtracker[element.getListId()] = count;
    } else if (type == DocumentApp.ElementType.HORIZONTAL_RULE) {

        // HORIZONTAL_RULE
        tags = ['<hr />', '']

    } else if (type == DocumentApp.ElementType.TABLE) {

        // TABLE
        tags = ['<table>', '</table>']

    } else if (type == DocumentApp.ElementType.TABLE_ROW) {

        // TABLE_ROW
        tags = ['<tr>', '</tr>'];

    } else if (type == DocumentApp.ElementType.TABLE_CELL) {

        // TABLE_CELL
        tags = ['<td>', '</td>'];

    } else if (type == DocumentApp.ElementType.TEXT) {

        // TEXT - this stops us pushing empty tags
        tags = null;
    }

    // PUSH TAG 0 (START)
    if (tags) {
        items.push(tags[0]);
    }
    // PUSH TEXT OR CHILDREN
    if (type == DocumentApp.ElementType.TEXT) {

        // TEXT PROCESSING
        var indexes = element.getTextAttributeIndices();
        var text = element.getText();
        if (indexes.length <= 1) {
            // This is one chunk of text. 
            var tag;
            tag = element.isBold() ? 'b' : tag;
            tag = element.isItalic() ? 'i' : tag;
            tag = element.isUnderline() ? 'u' : tag;
            tag = element.isBold() && element.isItalic() ? 'em' : tag;
            tag = element.getLinkUrl() ? 'a' : tag;

            if (tag) {
                items.push('<' + tag + (element.getLinkUrl() ? ' href="' + element.getLinkUrl() + '"' : '') + '>');
            }
            items.push(text);
            if (tag) {
                items.push('</' + tag + '>');
            }
        } else {
            var attr, end, txt, url, tag;
            for (var i = 0; i < indexes.length; i++) {
                attr = element.getAttributes(indexes[i]);
                end = i + 1 < indexes.length ? indexes[i + 1] : text.length;
                txt = text.substring(indexes[i], end);
                url = element.getLinkUrl(indexes[i]);
                tag = null;
                tag = attr.BOLD ? 'b' : tag;
                tag = attr.ITALIC ? 'i' : tag;
                tag = attr.UNDERLINE ? 'u' : tag;
                tag = attr.BOLD && attr.ITALIC ? 'em' : tag;
                tag = url ? 'a' : tag;
                if (tag) {
                    items.push('<' + tag + (url ? ' href="' + url + '"' : '') + '>');
                }
                items.push(txt);
                if (tag) {
                    items.push('</' + tag + '>');
                }
            }
        }
    } else if (element.getNumChildren && element.getNumChildren() > 0) {
        for (var i = 0; i < element.getNumChildren(); i++) {
            //We recurse if this item has children.
            items = items.concat(itemToHTML(element.getChild(i), listtracker));
        }
    }

    // PUSH TAG 1 (END)
    if (tags) {
        items.push(tags[1]);
    }
    return items;
}
