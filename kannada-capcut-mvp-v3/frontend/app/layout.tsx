import "./globals.css";
export const metadata={title:"KannadaCut",description:"Kannada-first AI video editor"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="kn"><body>{children}</body></html>
}
