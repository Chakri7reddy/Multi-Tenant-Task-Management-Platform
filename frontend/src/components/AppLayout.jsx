import AppSidebar from './AppSidebar';

export default function AppLayout({ children, onOpenSlideover, hideSidebar }) {
  return (
    <div className={`app-layout app-layout-sidebar ${hideSidebar ? 'app-layout-focus' : ''}`}>
      {!hideSidebar && <AppSidebar onOpenSlideover={onOpenSlideover} />}
      <main className="app-main-wrap">
        {children}
      </main>
    </div>
  );
}
