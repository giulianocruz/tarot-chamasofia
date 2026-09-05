export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div lang="en-US" data-locale="en-US">
    <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='en-US';" }} />
    {children}
  </div>;
}
