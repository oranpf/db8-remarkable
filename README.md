# @db8/remarkable

### An inverted approach to markdown enhancement

Add special comment may contain one or more semantic claims:

    <!-- : idea : superset-of = universal-semantic-metadata-model -->  
    <!-- : reasons = separate-concerns manage-content- -->
    <!-- : remarkable = is = markdown = language-superset -->

If a comment begins with whitespace (except excess dashes in the comment start token) followed by a single colon followed by whitespace, then the comment can be interpreted as a semantic metadata tag about some or all of the content that follows or is otherwise referenced in the claim.

A semantic tag consists of a sequence of words and special tokens separated by whitespace:

* `:` indicates the beginning of a semantic claim
  * A tag can contain any number of claims
* `=` separates the parts of a claim
  * The generic specification allows a claim to have any number of parts (interpreted however a consumer wants), but the intent is to support semantic object taxonomies and ontologies as graphs (e.g. triples or quads)
  * when no `=` is included, the word or words are generally interpreted as describing the type of object represented by the content that follows
  * when only one `=` is included, the claim is generally interpreted assigning an attribute (or adding a predicate and object) to the the content follows
  * when `=` is the first or last token in a claim, or there are two `=` with no word between, the content that claim is interpreted as a semantic claim with the content that follows being the missing word (so `: = name = remarkable` is equivalent to `: name = remarkable`)
  * otherwise, three or four words separated by = are interpreted as semantic metadata with all terms defined (though the could reference elements within the current above or below)
  * when multiple words are present in one part of a claim not separated by `=` it is generally interpreted as a cartesian product (so `: a b = c d` is equivalent to `: a = c : a = d : b = c : b = d`)
* A word can be one of the following
  1. A quoted string (e.g. `"Hello"`) representing plain text
  2. Any sequence of non-whitespace characters (with the intent of subsets of this specification explicitly supporting names, URIs, schema prefixed names, etc.)


### Escapes

* `\` followed by any other character in an unquoted token is interpreted as that character:
  * This can be used, if needed, to ensure that the semantic tag also remains a valid HTML comment even if with problematic character sequences
  * Inside of quotes around a word (`"`), this is used to lex strings as words, which should follow the JSON standard for string, allowing for spaces and other special characters inside of a word. Initially, it will support the JSON standard with tolerance for \xHH, \uHHHH for any hex digits, and \c representing c for any undefined sequence \c.
  * outside of quotes, the `\` is interpreted after lexing the tag into tokens
  * A sequence of two characters beginning with `\` within an unquoted word will have the initial `\` removed
  * If a word ending with a single `\` or consisting solely of a single `\` will retain it as part of the word (so `: root = \` is equivalent to `: root = \\`)
* Unquoted words should be url encoded by convention (most importantly, whitespace and `%` itself) though the remarkable lexer will not interpret these sequences, sending them to the consumer as they are in tag after processing backslash escape sequences.



### Motivation

Markdown is nice. It reads as text. It formats to rich text like html. But it's missing things. *It's meant to!*

Various flavors and extensions take it further. Will it ever be enough? *Does taking it too far detract from its purpose?*

Why not let markdown be markdown? Enhancements are nice, styles are nice, but blobs of markdown should be portable and progressively formattable without being overly opinionated.

And what if that portable rich text markdown could inform the semantic web while carrying just the basic rich text of markdown itself into the content of semantic queries?

&nbsp;

-------------------

&nbsp;
 

# Draft of Level 2

## Working Title: Owldown

    <!-- : r = http://remarkable/owl-down -->
    <!-- : r:name = 'own-down' -->
    <!-- : r:remarkable = r:supports = -->

Instead of adding enhancements to markdown itself, a syntax is added for unobtrusive html comments to inform semantic domains (taxonomies / ontologies / vocabularies) on how to further enhance the display or voicing of content while retaining the underlying simplicity of markdown for clients unaware the semantic domain.

Write markdown that reads as text and works nicely anywhere. Where you control the output, you can further add richness to your voice, dimensionality, or anything else you want to control based on a known or custom semantic domain.

## Syntax

### Formal Rules:

Extending and limiting the terms defined in remarkable and adding a parsing layer:

    word            : (prefix ':')* (URI | string | identifier)
    prefix          : identifier
    identifier      : (non-space-character* | quoted-string)

### Reserved identifiers

Reserved identifiers beginning with `@` with language-specific semantics allowing the simple language itself to bootstrap up to support for higher levels of complexity if needed.

The meaning of the terms above is up to the reader unless a default domain is specified, e.g. in the form of a UTI or namespace. These can offer guidance on how to interpret a term. Local or external namespaces can be renamed or given aliases as follows:

    <!-- : . = @alias = http://domain1/default-namespace -->
    <!-- : ns1 = @alias = http://domain2/other-namepsace -->

When referencing the default namespace (if specified) a single `.` can be used as a placeholder for no namespace prefix, as in the first example above. To use a the above or an explicit namespace:

    <!-- : domain1-concept-light -->
    <!-- : ns1.domain2-taxa = includes = @this -->
