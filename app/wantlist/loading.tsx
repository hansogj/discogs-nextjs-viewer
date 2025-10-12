import AppLayout from '@/components/layout/AppLayout';
import LoadingIndicator from '@/components/LoadingIndicator';

export default function Loading() {
  return (
    <AppLayout activeView="wantlist">
      <LoadingIndicator message="Loading your wantlist..." />
    </AppLayout>
  );
}