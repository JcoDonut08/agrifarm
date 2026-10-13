import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    strictMode: true,
    progress: false,
    serverHead: 'socialHead',
    title: (title) => (title ? `${title} | AgriFarm` : 'AgriFarm'),
});
