import AppLayout from '@/components/layout/AppLayout';
import LoadingIndicator from '@/components/LoadingIndicator';

export default function Loading() {
  return (
    <AppLayout activeView="duplicates">
      <LoadingIndicator message="Finding your duplicates..." />
    </AppLayout>
  );
}