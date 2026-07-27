import Header from '@/components/Header';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from 'react-hot-toast';
import './program.css';

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <Header />
      <div className="program-builder slim-scrollbar">
        <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
      </div>
      <Toaster position="top-right" />
    </QueryProvider>
  );
}
