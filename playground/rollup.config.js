import lwc from '@lwc/rollup-plugin';
import replace from '@rollup/plugin-replace';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const __ENV__ = process.env.NODE_ENV ?? 'development';

export default (args) => {
    return {
        input: 'src/main.js',

        output: {
            file: 'dist/main.js',
            format: 'esm',
        },

        plugins: [
            replace({
                'process.env.NODE_ENV': JSON.stringify(__ENV__),
                preventAssignment: true,
            }),
            nodeResolve(),
            lwc({
                exclude: ['/Users/jrodriguezvelasco/projects/github/lwc/node_modules/@preact/signals-core/dist/signals-core.mjs']
            }),

            args.watch &&
                serve({
                    open: false,
                    port: 3000,
                }),
            args.watch && livereload(),
        ],
    };
};
