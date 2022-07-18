/**
 * Create a train set file to be consumed by UniXcoder when fine-tuning..
 */

import { cli } from "../utils/cli";
import { resolve } from "path";
import { access, mkdir } from "fs/promises";
import { createReadLineStream } from "../utils/createReadLineStream";
import { createReadStream, createWriteStream } from "fs";
import { drop } from "../utils/asyncIteration";
import { finished } from 'stream/promises';
import replaceStream from 'replacestream';

type Options = {
    datasetFolder: string;
};

async function getOptions(): Promise<Options> {
    const rawOptions = cli(
        'Create a file used for training UniXcoder',
        [
            { name: 'datasetFolder', optional: false, description: 'Folder for a dataset. Must contain ./sets/train.csv' },
        ],
        __filename
    )

    const options: Options = {
        datasetFolder: resolve(process.cwd(), rawOptions.datasetFolder),
    };

    for (const path of [
        options.datasetFolder,
        resolve(options.datasetFolder, './sets'),
        resolve(options.datasetFolder, './sets/train.csv'),
        resolve(options.datasetFolder, './repository-files'),
    ]) {
        try {
            await access(path);
        } catch (e) {
            console.error(`Can not access '${path}'. Are you sure it exists? Error: ${e}`);
            process.exit(1);
        }
    }

    return options;
}

async function main() {
    const options = await getOptions();

    const lineStream = createReadLineStream(resolve(options.datasetFolder, './sets/train.csv'));
    await mkdir(resolve(options.datasetFolder, './datasets'), { recursive: true });
    const writeStream = createWriteStream(resolve(options.datasetFolder, `./datasets/train.txt`))

    for await (const line of drop(1, lineStream)) {
        const [repository, file] = line.split(',');
        const readStream = createReadStream(resolve(options.datasetFolder, './repository-files', file))
            .pipe(replaceStream(/[\n\r]+/g, '<EOL>'));
        await finished(readStream.pipe(writeStream, { end: false }))
    }

    writeStream.end();
}

main();