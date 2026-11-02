import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// `dir="auto"` lets every block follow its own text direction, so right-to-left languages render correctly.
const block = (Tag, className) =>
  function Block({ node: _node, ...props }) {
    return <Tag dir="auto" className={className} {...props} />
  }

const components = {
  p: block('p', 'my-2 first:mt-0 last:mb-0'),
  ul: block('ul', 'my-2 list-disc ps-6'),
  ol: block('ol', 'my-2 list-decimal ps-6'),
  li: block('li', 'my-1'),
  h1: block('h1', 'mt-3 mb-1 text-lg font-semibold'),
  h2: block('h2', 'mt-3 mb-1 text-lg font-semibold'),
  h3: block('h3', 'mt-3 mb-1 font-semibold'),
  blockquote: block('blockquote', 'my-2 border-s-4 border-slate-300 ps-3 text-slate-600'),
  pre: block('pre', 'my-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-sm'),
  th: block('th', 'border border-slate-300 bg-slate-50 px-2 py-1 text-start font-semibold'),
  td: block('td', 'border border-slate-300 px-2 py-1'),
  table: ({ node: _node, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm" {...props} />
    </div>
  ),
}

export default function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}
