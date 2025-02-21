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
        'dotenv',
        'ioredis',
        'reflect-metadata',
        'tsyringe',
        'chromadb',
        '@langchain/openai',
        'langchain',
        'openai'
    ],
    onwarn: (warning) => {
        if (warning.code === 'UNRESOLVED_IMPORT') return
    },
    plugins: [typescript({
        tsconfig: './tsconfig.json',
        clean: true
    })],
}
