import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AiMessageContent.module.css';

export function AiMessageContent({ content }: { content: string }) {
  return (
    <div className={styles.content}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={['img']}
        components={{
          table: ({ children }) => (
            <div className={styles.tableScroll} role="region" aria-label="Report table" tabIndex={0}>
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
