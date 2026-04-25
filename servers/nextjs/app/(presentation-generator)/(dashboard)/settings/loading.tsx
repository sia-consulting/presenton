export default function LoadingProfile() {
    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            <main className="flex-1 container mx-auto px-6 max-w-2xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden">
                    <div className="space-y-6 py-8">
                        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />

                        {[...Array(3)].map((_, index) => (
                            <div key={index} className="bg-card border border-border rounded-2xl p-6">
                                <div className="space-y-3">
                                    <div className="h-5 w-32 bg-muted animate-pulse rounded-md" />
                                    <div className="h-4 w-64 bg-muted animate-pulse rounded-md" />
                                    <div className="flex gap-3 mt-4">
                                        <div className="h-11 w-28 bg-muted animate-pulse rounded-xl" />
                                        <div className="h-11 w-28 bg-muted animate-pulse rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
