import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Home, AlertTriangle, Lock, SearchX, ServerCrash } from 'lucide-react';

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
        500: 'Whoops, something went wrong on our servers. Our team has been notified.',
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
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 20px',
            backgroundColor: '#f9fafb',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative'
        }}>
            <Head title={title} />
            
            {/* Logo in top left */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/images/logo.png" alt="AgriFarm Logo" style={{ height: '40px', width: 'auto' }} />
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>AgriFarm</span>
            </div>
            
            <div style={{ 
                maxWidth: '600px', 
                width: '100%', 
                backgroundColor: 'white', 
                borderRadius: '24px', 
                padding: '50px 40px', 
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                border: '1px solid rgba(18, 138, 57, 0.1)'
            }}>
                
                {/* Mascot & Icon Header */}
                <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 30px' }}>
                    <div style={{ 
                        width: '130px', 
                        height: '130px', 
                        borderRadius: '50%', 
                        overflow: 'hidden',
                        border: '4px solid #f0fdf4',
                        boxShadow: '0 8px 16px rgba(18, 138, 57, 0.15)',
                        backgroundColor: '#f0fdf4'
                    }}>
                        <img 
                            src={mascotImage}
                            alt="Kuya Ani Mascot" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2) translateY(5px)' }} 
                        />
                    </div>
                    <div style={{
                        position: 'absolute',
                        bottom: '-5px',
                        right: '-5px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid white',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                        <Icon size={22} />
                    </div>
                </div>

                <h1 style={{ 
                    fontSize: '32px', 
                    fontWeight: '800', 
                    color: '#1f2937', 
                    marginBottom: '16px',
                    letterSpacing: '-0.02em'
                }}>
                    {title}
                </h1>
                
                <p style={{ 
                    fontSize: '16px', 
                    color: '#4b5563', 
                    lineHeight: '1.6',
                    marginBottom: '32px',
                    maxWidth: '400px',
                    margin: '0 auto 32px'
                }}>
                    {description}
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <button 
                        onClick={() => window.history.back()}
                        style={{ 
                            backgroundColor: 'white', 
                            color: '#4b5563', 
                            border: '1px solid #d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            borderRadius: '50px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    
                    <Link 
                        href="/" 
                        style={{ 
                            backgroundColor: '#128a39',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            borderRadius: '50px',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Home size={18} />
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}