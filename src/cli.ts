import { promises as fs } from 'fs';
import * as yargs from 'yargs';
import { main } from './main';

async function cli() {
  await yargs
    .env('DASHPAD_GITHUB')
    .command(
      ['$0 USERNAME', 'monitor USERNAME'],
      'Retrieve assigned GitHub issues and reviewable PRs',
      (opts) => opts
        .option('token', {
          alias: 't',
          type: 'string',
          description: 'GitHub token (default: taken from ~/.github/USERNAME)',
          requiresArg: true,
        })
        .positional('USERNAME', {
          type: 'string',
          description: 'GitHub username',
        })
        .demandOption('USERNAME'),
      async (argv) => {
        await main({
          username: argv.USERNAME,
          token: argv.token ?? await (async () => {
            return (await fs.readFile(`${process.env.HOME}/.github/${argv.USERNAME}`, { encoding: 'utf-8' })).trim();
          })(),
        });
      },
    )
    .strict()
    .argv;
}

cli().catch(e => {
  console.error(e);
  process.exitCode = 1;
});