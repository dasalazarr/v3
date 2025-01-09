import typescript from 'rollup-plugin-typescript2'

export default {
    input: 'src/app.ts',
    output: {
        file: 'dist/app.js',
        format: 'esm',
    },
    external: [
        '@builderbot/bot',
        'googleapis',
        'google-auth-library',
        'dotenv'
    ],
    onwarn: (warning) => {
        if (warning.code === 'UNRESOLVED_IMPORT') return
    },
    plugins: [typescript({
        tsconfig: './tsconfig.json',
        clean: true
    })],
}
