import { defineConfig } from 'jsrepo';
import { github } from 'jsrepo/providers';

export default defineConfig({
    providers: [github()],
    // configure where stuff comes from here
    registries: [
        'react-bits=github:DavidHDev/react-bits',
    ],
    // configure where stuff goes here
    paths: {},
});