'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowLeft, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryTabs } from '@/lib/hooks/use-query-tabs';
import {
  DownloadSizeSelector,
  ZipCreation,
  DownloadPackageCard,
} from '@/components/download-center';
import {
  getEventById,
  getDownloadablePhotos,
  getDownloadPackagesByEventId,
  getDownloadSettings,
  mockDownloadSizes,
} from '@/lib/mock-data';

export default function DownloadCenterPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [activeTab, setActiveTab] = useQueryTabs("new", "tab");

  const event = getEventById(eventId);
  const downloadablePhotos = getDownloadablePhotos(eventId);
  const existingPackages = getDownloadPackagesByEventId(eventId);
  const settings = getDownloadSettings(eventId);

  const [selectedSize, setSelectedSize] = useState('web');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const currentSize = mockDownloadSizes.find((s) => s.id === selectedSize);
  const estimatedTotalSize = () => {
    const perPhoto = currentSize?.estimatedSize.includes('KB') ? 0.5 :
      currentSize?.estimatedSize.includes('25') ? 25 :
        currentSize?.estimatedSize.includes('8') ? 8 : 2;
    const total = downloadablePhotos.length * perPhoto;
    return total > 1000 ? `${(total / 1000).toFixed(1)} GB` : `${Math.round(total)} MB`;
  };

  const handleCreateZip = () => {
    console.log('Creating zip with', downloadablePhotos.length, 'photos at', selectedSize, 'quality');
  };

  const handleDownloadPackage = (packageId: string) => {
    console.log('Downloading package', packageId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/event/${eventId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-semibold">Download Center</h1>
                <p className="text-sm text-muted-foreground">{event.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Create New Download</TabsTrigger>
            <TabsTrigger value="history">My Downloads ({existingPackages.length})</TabsTrigger>
          </TabsList>

          {/* New Download Tab */}
          <TabsContent value="new" className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Download Information</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Downloads expire after {settings.expiryDays} days. You can create up to {settings.maxDownloadsPerUser} download packages.
                </p>
              </div>
            </div>

            {/* Photo Preview */}
            <div>
              <h3 className="font-semibold mb-3">{downloadablePhotos.length} Photos Available</h3>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                {downloadablePhotos.slice(0, 20).map((photo) => (
                  <div key={photo.id} className="aspect-square rounded overflow-hidden bg-muted">
                    <Image
                      src={photo.thumbnail}
                      alt=""
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {downloadablePhotos.length > 20 && (
                  <div className="aspect-square rounded bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium">
                      +{downloadablePhotos.length - 20}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Size Selector */}
            <DownloadSizeSelector
              sizes={mockDownloadSizes}
              allowedSizes={settings.allowedSizes}
              selectedSize={selectedSize}
              onSizeSelect={setSelectedSize}
              photoCount={downloadablePhotos.length}
            />

            {/* Zip Creation */}
            <ZipCreation
              photoCount={downloadablePhotos.length}
              selectedSize={currentSize?.label || 'Web'}
              estimatedSize={estimatedTotalSize()}
              onCreateZip={handleCreateZip}
            />
          </TabsContent>

          {/* Download History Tab */}
          <TabsContent value="history" className="space-y-4">
            {existingPackages.length === 0 ? (
              <div className="text-center py-12">
                <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No downloads yet</h3>
                <p className="text-muted-foreground">Create your first download package to get started</p>
              </div>
            ) : (
              existingPackages.map((pkg) => (
                <DownloadPackageCard
                  key={pkg.id}
                  package_={pkg}
                  onDownload={handleDownloadPackage}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

