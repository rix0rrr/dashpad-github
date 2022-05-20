import { graphql } from '@octokit/graphql';
import { Button, Color, DashboardState, Tab } from './protocol';

export interface MainOptions {
  readonly token: string;
  readonly username: string;
}

export async function main(options: MainOptions) {
  const query = graphql.defaults({
    headers: {
      // Enable preview APIs
      accept: 'application/vnd.github.merge-info-preview+json,application/vnd.github.antiope-preview+json',
      authorization: `token ${options.token}`,
    },
  });

  const db = new GitHubDashboard(query, options.username);

  const dashboard: DashboardState = {
    tabs: await Promise.all([
      db.issuesTab(),
      db.pullsTab(),
    ]),
  };

  console.log(JSON.stringify(dashboard, undefined, 2));
}

class GitHubDashboard {
  constructor(private readonly query: typeof graphql, private readonly username: string) {
  }

  public async issuesTab(): Promise<Tab> {
    const { search } = await this.query(`{
      search(query: "is:issue is:open assignee:${this.username} archived:false", type: ISSUE, last: 100) {
        nodes {
          ... on Issue {
            title
            url
            state
            createdAt
            comments(last: 5) { nodes { createdAt, author { login, __typename } } }
            labels(first: 100) { nodes { name } }
          }
        }
      }
    }`);

    return {
      color: { type: 'solid', paletteColor: 11 }, // Dark orange
      selectedColor: { type: 'solid', paletteColor: 9 }, // Bright
      tabType: 'list',
      buttons: search.nodes.map((i: any) => ({
        link: i.url,
        color: this.colorFromIssue(i),
      } as Button)),
    };
  }

  public async pullsTab(): Promise<Tab> {
    const { search } = await this.query(`{
      search(query: "is:pr is:open review-requested:${this.username} archived:false", type: ISSUE, last: 100) {
        nodes {
          ... on PullRequest {
            title
            url
            authorAssociation
            mergeable
            isDraft
            createdAt
            comments(last: 5) { nodes { createdAt, author { login, __typename } } }
            labels(first: 100) { nodes { name } }
            commits(last: 1) {
              nodes {
                commit {
                  pushedDate
                  statusCheckRollup {
                    state
                  }
                }
              }
            }
          }
        }
      }
    }`);

    // There is a bug in the GraphQL API which sometimes returns objects as lists of (k,v) pairs
    const prs = forceObjects(search.nodes);

    return {
      color: { type: 'solid', paletteColor: 15 }, // Dark yellow
      selectedColor: { type: 'solid', paletteColor: 13 }, // Bright yellow
      tabType: 'list',
      buttons: prs.map(p => ({
        link: p.url,
        color: this.colorFromPR(p),
      })),
    };
  }

  private hasRecentActivity(issue: any): boolean {
    const dates = new Array<Date>();
    if (issue.createdAt) {
      dates.push(new Date(issue.createdAt));
    }

    if (issue.comments?.nodes) {
      // Trigger on comments NOT made by a bot *after* our user has left a comment
      const userComments: any[] = issue.comments.nodes.filter((c: any) => c.author.__typename === 'User' && !c.author.login.endsWith('automation'));

      // Remove all comments up to and including the last comment our user has made
      let i = userComments.findIndex(c => c.author.login === this.username);
      while (i > -1) {
        userComments.splice(0, i + 1);
        i = userComments.findIndex(c => c.author.login === this.username);
      }

      // The remaining comments can be added to the list
      dates.push(...userComments.map(c => new Date(c.createdAt)));
    }

    // Most recent commit
    if (issue.commits?.nodes?.[0]?.commit?.pushedDate) {
      dates.push(new Date(issue.commits?.nodes?.[0]?.commit?.pushedDate));
    }

    const cutOff = Date.now() - 60 * 60 * 1000;
    return dates.some(d => d.getTime() > cutOff);
  }

  private colorFromIssue(issue: any): Color {
    const recent = this.hasRecentActivity(issue);
    const type = recent ? 'pulse' : 'solid';

    const labels = issue.labels?.nodes?.map((n: any) => n.name) ?? [];
    if (labels.includes('feature-request')) {
      return { type, paletteColor: 18 }; // Dark green
    }
    if (labels.includes('bug')) {
      return { type, paletteColor: 6 }; // Dark red
    }

    return { type, paletteColor: 2 }; // Grey
  }

  private colorFromPR(pr: any): Color {
    const recent = this.hasRecentActivity(pr);
    const type = recent ? 'pulse' : 'solid';

    const commitStatus = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;

    const isGood = pr.mergeable === 'MERGEABLE' && commitStatus === 'SUCCESS';

    if (pr.isDraft) {
      return { type, paletteColor: 117 }; // Grey
    }
    if (pr.authorAssociation === 'MEMBER') {
      return { type, paletteColor: isGood ? 53 : 55 }; // Pink (hot or muted)
    }

    const labels = pr.labels?.nodes?.map((n: any) => n.name) ?? [];
    if (labels.includes('p1')) {
      return { type, paletteColor: isGood ? 41 : 43 }; // Cyan (hot or muted)
    }
    return { type, paletteColor: 64 }; // Muted green
  }
}

/**
 * If we detect an array of array of pairs, turn it into an array of objects
 */
function forceObjects(x: any): any[] {
  return Array.isArray(x) ? x.map(forceObject) : x;
}

/**
 * If we detect an array of pairs, make it an object
 */
function forceObject(x: any): any {
  if (Array.isArray(x)) {
    const ret: any = {};
    for (const [key, value] of x) {
      ret[key] = forceObjects(value);
    }
    return ret;
  }
  return x;
}


