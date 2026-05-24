; Tree-sitter injections for TypeScript/JavaScript
; These enable parsing embedded languages in template literals

; SQL in tagged template literals: sql`SELECT * FROM users`
(call_expression
  function: (identifier) @injection.language
  (#eq? @injection.language "sql")
  arguments: (template_string) @injection.content)

; CSS in styled-components: styled.div`color: red;`
(call_expression
  function: (member_expression
    object: (identifier) @injection.language
    (#eq? @injection.language "styled"))
  arguments: (template_string) @injection.content)

; CSS in css template literal: css`display: flex;`
(call_expression
  function: (identifier) @injection.language
  (#eq? @injection.language "css")
  arguments: (template_string) @injection.content)

; GraphQL in gql template literal: gql`query { users { name } }`
(call_expression
  function: (identifier) @injection.language
  (#eq? @injection.language "gql")
  arguments: (template_string) @injection.content)

; HTML in html template literal: html`<div>content</div>`
(call_expression
  function: (identifier) @injection.language
  (#eq? @injection.language "html")
  arguments: (template_string) @injection.content)

; Regex in RegExp constructor: new RegExp(`pattern`, 'flags')
(new_expression
  constructor: (identifier) @injection.language
  (#eq? @injection.language "RegExp")
  arguments: (arguments
    (template_string) @injection.content))
