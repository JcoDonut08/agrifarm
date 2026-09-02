import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    strictMode: true,
    title: (title) => (title ? `${title} | AgriFarm` : 'AgriFarm'),
});
