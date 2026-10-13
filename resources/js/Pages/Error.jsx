import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Home, AlertTriangle, Lock, SearchX, ServerCrash } from 'lucide-react';

import AppMark from '../Components/AppMark';

export default function ErrorPage({ status }) {
    const title = {
        503: '503: Service Unavailable',
        500: '500: Server Error',
        404: '404: Page Not Found',
        403: '403: Access Denied',
        401: '401: Unauthorized',
    }[status] || 'Error';

    const description = {
        503: 'Sorry, we are doing some maintenance. Please check back soon.',
        500: 'Sorry, something went wrong on our servers. Please try again in a moment.',
        404: 'Sorry, the page you are looking for could not be found. It might have been moved or deleted.',
        403: 'Sorry, you are forbidden from accessing this page. You do not have the necessary permissions.',
        401: 'Sorry, your session has expired or you are unauthorized. Please log in again.',
    }[status] || 'An unexpected error occurred.';

    const Icon = {
        503: AlertTriangle,
        500: ServerCrash,
        404: SearchX,
        403: Lock,
        401: Lock,
    }[status] || AlertTriangle;
    
    // Dynamic Mascot image based on error
    let mascotImage = '/images/farmer-mascot-final.jpg';
    if (status === 404) mascotImage = '/images/kuya-ani-404.jpg';
    if (status === 403 || status === 401) mascotImage = '/images/kuya-ani-403.jpg';
    if (status >= 500) mascotImage = '/images/kuya-ani-500.jpg';

    return (
        <div className="flex min-h-dvh flex-col bg-cream-50 px-4 py-5 font-sans text-forest-950 dark:bg-night-950 dark:text-white sm:px-8 sm:py-7 lg:px-10">
            <Head title={title} />

            <header className="self-start">
                <AppMark compact />
            </header>

            <main className="grid flex-1 place-items-center py-8 sm:py-12">
                <section aria-labelledby="error-title" className="w-full max-w-xl rounded-2xl border border-forest-950/10 bg-white px-6 py-8 text-center shadow-sm dark:border-white/10 dark:bg-night-900 sm:p-10">
                    <div className="relative mx-auto mb-6 size-28 sm:size-32">
                        <div className="size-full overflow-hidden rounded-full border-4 border-forest-50 bg-forest-50 dark:border-forest-900 dark:bg-forest-900">
                            <img
                                src={mascotImage}
                                alt="Kuya Ani mascot"
                                className="size-full translate-y-1 scale-120 object-cover"
                            />
                        </div>
                        <span aria-hidden="true" className="absolute -bottom-1 -right-1 grid size-10 place-items-center rounded-full border-3 border-white bg-red-600 text-white dark:border-night-900">
                            <Icon size={20} />
                        </span>
                    </div>

                    <h1 id="error-title" className="text-[1.65rem] font-bold leading-tight tracking-tight sm:text-[2rem]">
                        {title}
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-stone-600 dark:text-stone-300 sm:text-base">
                        {description}
                    </p>

                    <div className="mx-auto mt-7 grid w-full max-w-sm grid-cols-1 gap-3 [--ui-control-height:48px] sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="app-secondary-button w-full whitespace-nowrap border border-forest-200 bg-white text-forest-800 hover:bg-forest-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-600/30 dark:border-white/15 dark:bg-night-800 dark:text-white dark:hover:bg-night-700"
                        >
                            <ArrowLeft size={18} className="shrink-0" aria-hidden="true" />
                            <span>Go Back</span>
                        </button>
                        <Link
                            href="/"
                            className="app-primary-button w-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-600/30"
                        >
                            <Home size={18} className="shrink-0" aria-hidden="true" />
                            <span>Return Home</span>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
