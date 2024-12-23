import typescript from 'rollup-plugin-typescript2'

export default {
    input: 'src/app.ts',
    output: {
        file: 'dist/app.js',
        format: 'esm',
        sourcemap: true
    },
    external: [
        '@builderbot/bot',
        '@builderbot/provider-meta',
        'dotenv',
        'googleapis',
        'openai'
    ],
    onwarn: (warning) => {
        if (warning.code === 'UNRESOLVED_IMPORT') return
    },
    plugins: [
        typescript({
            tsconfig: './tsconfig.json',
            clean: true
        })
    ],
}
