import AppLayout from '@/components/layout/AppLayout';
import LoadingIndicator from '@/components/LoadingIndicator';

export default function Loading() {
  return (
    <AppLayout activeView="collection">
      <LoadingIndicator message="Loading your collection..." />
    </AppLayout>
  );
}