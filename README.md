# @db8/remarkable

## Level 1 Specification

### An inverted approach to Markdown enhancement

A specific comment syntax supporting one or more semantic/metadata claims:

    <!-- 
      : idea : superset-of = universal-metadata-model 
      : purpose = separate-concerns manage-content
      : remarkable = extends = Markdown
    -->

## Motivation

Markdown is nice. It reads nicely as text, and formats to rich text, but it's missing a lot of things. Many flavors have emerged to add these "missing" features.

* Will it ever be enough?
* Does taking it too far detract from its purpose?
* Why not let Markdown be Markdown? Markdown should be portable and progressively formattable without being overly opinionated.

Another missing feature is semantics and metadata. This leads to the idea of a semantic metadata extension. Rather than offer opinions about how to display the content, it makes claims about how to interpret the content semantically, potentially solving two problems at once:

* The metadata can suggest optional formatting extensions or styles
* Consumers can use the metadata however they want
* The metadata can include a richer machine-readable representation of the knowledge included in the document

## Remarkable Syntax

If a comment begins with whitespace (after excess dashes in the comment start token) followed by a single '`:`' followed by whitespace, then the comment can be interpreted as a semantic metadata tag.

A semantic tag consists of a sequence of tokens separated by whitespace*:

* A token can be:
  * any sequence of non-whitespace* characters that cannot be mistaken for the end of a comment
  * a properly quoted string, with escape sequences as needed, *thus allowing whitespace
  * special tokens `:`, `=`, `.` and any token beginning with `@`, `$`, `!` are reserved for specifications
* `:` indicates the beginning of a semantic claim
  * A semantic metadata tag can contain any number of claims
  * The content and semantic tags that follow are often part of the claim
  * The scope of semantic tag is all content (and semantic tags) that follow it in the document _unless_ one of a variety of features is used to change the scope (e.g. `: @parent = x` to explicitly place the block in a structure, `: @end` to end the nearest open scope, or a schema definition that alters the scope based on type, name, or other attributes)
* `=` separates the parts of a claim
  * The generic specification allows a claim to have any number of parts (interpreted however a consumer wants), but the intent is to support semantic object taxonomies and ontologies as graphs (e.g. semantic triples or quads)
  * when no `=` is included, the word or words are generally interpreted as type / category of the content that follows
  * when only one `=` is included, the claim is generally interpreted assigning an attribute (or a predicate and object) to the the content that follows
  * when `=` is the first or last token in a claim, or there are two `=` with no words between (or the special word `@this` is used), the claim is interpreted with the missing word or `@this` being the content that follows, so the following are all equivalent:
    * `: remark` 
    * `: type = remark`
    * `: = type = remark`
    * `: @this = type = remark`
  * otherwise, three or four words separated by `=` are interpreted as semantic metadata with all terms defined (either by the consumer, the current document, or external entities)
  * multiple tokens in one part of a claim not separated by `=` are interpreted as a cartesian product (so `: a b = c d` means `: a = c : a = d : b = c : b = d`)
* Future shorthand is expected in the form of `<!--@X-->`, for certain values of X

## Escape Sequences

* A `\` followed by any other character in an _unquoted_ token should be interpreted as that literal character without any special meaning
  * This can be used to ensure that the semantic tag remains a valid HTML comment (e.g. escaping `-->` as `--\>`) or include quotes (or spaces, though discouraged) in unquoted tokens
  * Also `\:` would be equivalent to `":"` as a value rather than a special token and `\@keyword` would not be considered reserved for specifications because the `@` is escaped
* Use double quotes (`"`) to created more lenient string tokens:
  * String tokens should support most ES features, but only double quotes, allowing for spaces and other special characters inside of a word.
  * UTF-8 should be supported in the underlying file, but string should also allow \xXX, \uXXXX, and \u{XXXXXX} syntax for unicode, the other common escape sequences in ES strings, and interpret any other sequence beginning with `\` in a string as if the `\` was not present


## Summary

Instead of adding enhancements to Markdown itself, a syntax is added for unobtrusive html comments to inform semantic domains (taxonomies / ontologies / vocabularies) on how to further enhance the display or voicing of content while retaining the underlying simplicity of Markdown for clients unaware the semantics.

The core library uses an existing Markdown interpreter and adds a simple parser for remarkable metadata tags to be used as a consumer wants. It also includes an API for restructuring documents based on an initial set of hard-coded assumptions and known words.


### **The above is still a work in progress, including the code**

Still, a concept described as the draft level 2 specification to incorporate standards and allow authors to define how to interpret the semantic metadata without prior assumptions.

&nbsp;

-------------------

&nbsp;
 
## Draft Level 2 Specification - 'Owldown'

Beginning with the 'remarkable' metadata, standardize and integrate with external ontologies.

    <!-- 
      : @. = @ns = http://remarkable/owl-down/
      : dbo = @ns = https://dbpedia.org/ontology/
      : rdfs = @ns = http://www.w3.org/2000/01/rdf-schema#
      : Markdown = rdfs:subClassOf = rdfs:Datatype
      : @. = rdfs:subClassOf = Markdown
      : @. = dbo:wikiPageWikiLink = https://github.com/oranpf/db8-remarkable
      : = @describes = @.
    -->

## From Syntax to Real Semantic Ontologies

Where the level 1 specification provides the syntax for a semantic metadata extension, the consumer has to know the semantics in advance.

  * The level 2 specification provides a layer for _telling_ consumers how to interpret it using existing external standards and content.
  * Embedding allows Markdown to provide the initial semantics of the content, relationships between sections, and external links needed to provide more detail.
  * It is not intended to provide an alternative to those standards or provide a feature set with the same power. Markdown documents can and should link to external URIs placing a document or section into a wider ontology, especially where the claims go beyond the scope of the document itself.


## Structure

As described above, many semantic claims can be included in one "tag" (defined as one comment of the appropriate format). These claims can only interact with each other explicitly, but explicit or implicit references to `@this` in that tag apply to all Markdown or semantic tags that follow until/unless structuring direction is given. Predefined schemas, explicit parent/child relationships, and other approaches can be specified, but one of the simpler approaches is to use `@end`

## Reserved identifiers

A few special characters are conditionally reserved by the language itself, for syntax or future specifications:

* `\` and `"` are used for strings and escaping as described above, but can be used in words if escaped
* `:` and `=` surrounded by whitespace form the core syntax delimiters as described above
* `@` is a reserved prefix for keywords, most of which will correspond to existing external entities, types, or properties. Some special cases include:
  * `@.` refers to the default namespace of a document, which would be URI of the document itself if not otherwise specified
  * `@this` refers to the Markdown and metadata content following a tag
  * `@end` ends a scope (where '`: @end` ' means '`: @this = @type = @end` ' and causes the following element to close one level of the preceding scope). The `@end` directive can be repeated ('`: @end : @end` ' will close two levels of scope).
  * `@end` can also be used as a predicate to name the scope being ended (if a scope begins with '`: @id = $X` ' or '`@name = "Section X"` ' then '`: [@this =] @end = $X` ' or '`: [@this =] @end = "Section X"`' will end the corresponding scope and any enclosed scopes).
* `$` is a reserved prefix for strict identifiers (with a limited character set) and is used to ensure uniqueness within a namespace, document, or other scope. Identifiers without this prefix can be nearly any string and may be overwritten or have different definitions at any scope.

## Inline Shorthand

A useful shorthand should be provided for inline semantics, consisting of `<!--@X-->` where X is a strictly-defined identifier or directive defined for shorthand use. Consider:

    <!--@$doggie-said-->Let's head back to <!--@$TN-->Tennessee<!--@end-->, Jed.<!--@end-->

A basic Markdown interpreter would display "Let's head back to Tennessee, Jed" but if the semantics are interpreted, `$TN` and `$doggie-said` are identifiers that can be elsewhere link to ontologies beyond the text. For example, `$TN` identifies a place that may be further linked with shared knowledge about the place, and `$doggie-said` can be associated with the known lyric, its relationships to other entities, grammatical or symbolic interpretations which may be local and/or external, as discovered. The first, simple enhancement would provide specified links or annotations for the identified elements. A more sophisticated interpretation would allow discovery of relationships not yet identified.

## Summary

Only the most basic features of Markdown are assumed when the data type is encountered, with extensions offering a variety of progressive enhancements. Richer display extensions may give an author more control over the layout and design of a given document. The semantic and ontological domains allow the author ways to express their intent, which can then be interpreted in a variety of ways. This can include user-specified display preferences, but more importantly, inclusion in larger knowledge graphs.