import sanitizeHtml from "sanitize-html";

// HTML de conteúdo editorial (CMS/blog): mantém formatação, links e imagens,
// remove scripts, handlers (onclick...), iframes, estilos e esquemas perigosos (javascript:).
// Usado ao SALVAR e ao RENDERIZAR (defesa em profundidade para conteúdo antigo).
export function sanitizeRichHtml(html: string | null | undefined): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: [
      "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
      "blockquote", "code", "pre", "ul", "ol", "li",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
      "span", "div",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      // Link que abre em nova aba não dá acesso a window.opener.
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }, true),
    },
  });
}
