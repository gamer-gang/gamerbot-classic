import axios from 'axios';
import { Message } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { client, logger } from '../../providers';
import { Context } from '../../types';
import { codeBlock, Embed, sanitize } from '../../util';

interface CategoriesResponse {
  trivia_categories: { id: number; name: string }[];
}

interface TriviaOptions {
  category?: string;
  type?: 'boolean' | 'multiple';
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface TriviaResponse {
  /**
   * #### Response Codes
   *
   * The API appends a "Response Code" to each API Call to help tell developers what the API is
   * doing.
   *
   * - Code 0: Success Returned results successfully.
   * - Code 1: No Results Could not return results. The API doesn't have enough questions for your
   *   query. (Ex. Asking for 50 Questions in a Category that only has 20.)
   * - Code 2: Invalid Parameter Contains an invalid parameter. Arguements passed in aren't valid.
   *   (Ex. Amount = Five)
   * - Code 3: Token Not Found Session Token does not exist.
   * - Code 4: Token Empty Session Token has returned all possible questions for the specified
   *   query. Resetting the Token is necessary.
   */
  response_code: 0 | 1 | 2 | 3 | 4;
  results: {
    category: string;
    type: 'boolean' | 'multiple';
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
}

interface TokenRequestResponse {
  response_code: number;
  response_message: string;
  token: string;
}

interface TokenResetResponse {
  response_code: number;
  token: string;
}

const triviaTypeAliases = {
  boolean: ['boolean', 'truefalse', 'tf', 'yesno', 'yn'],
  multiple: ['multiple', 'multiplechoice', 'mc', 'choice'],
};

const triviaDifficultyAliases = {
  easy: ['1', 'easy', 'ez'],
  medium: ['2', 'medium', 'md'],
  hard: ['3', 'hard', 'difficult'],
};

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export class CommandTrivia implements Command {
  cmd = ['trivia', 'triv', 'tr'];
  yargs: yargsParser.Options = {
    alias: { categories: ['c', 'category'], difficulty: 'd', type: 't' },
    string: ['categories', 'difficulty', 'type'],
  };
  docs: CommandDocs = [
    {
      usage: 'trivia [-c, --category <id>] [-d, --difficulty <difficulty>] [-t, --type <type>] ',
      description: 'play trivia, optional category',
    },
    {
      usage: 'trivia -c, --categories',
      description: 'display categories',
    },
  ];

  private token?: string;

  constructor() {
    client.on('ready', async () => {
      this.requestToken();
    });
  }

  async execute(context: Context): Promise<void | Message> {
    const { msg, args } = context;

    const options: TriviaOptions = {};

    try {
      msg.channel.startTyping();

      if (args.categories === '' || args.categories === true) {
        const res = await axios.get('https://opentdb.com/api_category.php');
        const { trivia_categories: categories } = res.data as CategoriesResponse;

        const categoryText = categories.map(({ id, name }) => `${id}: ${name}`).join('\n');

        const embed = new Embed({
          title: 'Trivia Categories',
          description:
            '(Use the numerical ID when specifying a category)\n' + codeBlock(categoryText),
        });

        msg.channel.send(embed);
        return;
      } else if (args.categories !== undefined) {
        if (!/^\d+$/.test(args.categories))
          return msg.channel.send(Embed.error('Invalid category ID'));

        options.category = args.categories;
      }
    } catch (err) {
      msg.channel.send(Embed.error('Error fetching question', codeBlock(err)));
    }

    if (args.type !== undefined) {
      const type = args.type.toLowerCase();
      const normalizedType = Object.keys(triviaTypeAliases).find(k =>
        triviaTypeAliases[k].find(keyword => type === keyword || keyword.includes(type))
      );

      if (!normalizedType) return msg.channel.send(Embed.error('Invalid type'));

      options.type = normalizedType;
    }

    if (args.difficulty !== undefined) {
      const diff = args.difficulty.toLowerCase();
      const normalizedDiff = Object.keys(triviaDifficultyAliases).find(k =>
        triviaDifficultyAliases[k].find(keyword => diff === keyword || keyword.includes(diff))
      );

      if (!normalizedDiff) return msg.channel.send(Embed.error('Invalid difficulty'));

      options.difficulty = normalizedDiff;
    }

    try {
      const question = await this.fetchQuestion(options);

      this.sendQuestion(question, context);
    } catch (err) {
      if (err.message.includes('invalid category'))
        return msg.channel.send(Embed.error('Invalid category'));

      return msg.channel.send(Embed.error(codeBlock(err)));
    }

    msg.channel.stopTyping(true);
  }

  private async requestToken(): Promise<boolean> {
    const data = (await axios.get('https://opentdb.com/api_token.php?command=request'))
      .data as TokenRequestResponse;
    if (data.response_code !== 0) {
      logger.error(`failed retrieving trivia session token! message: ${data.response_message}`);
      throw new Error(`Requesting token: ${data.response_message}`);
    }

    this.token = data.token;
    return true;
  }

  private async resetToken(): Promise<boolean> {
    const data = (
      await axios.get(`https://opentdb.com/api_token.php?command=reset&token=${this.token}`)
    ).data as TokenResetResponse;

    if (data.response_code !== 0) {
      logger.warn(`failed resetting trivia session token! getting new one instead`);
      return this.requestToken();
    }

    this.token = data.token;
    return true;
  }

  private async fetchQuestion(options?: TriviaOptions): Promise<TriviaResponse> {
    const params = new URLSearchParams({ amount: '1' });
    if (options?.category) params.set('category', options.category);
    if (options?.difficulty) params.set('difficulty', options.difficulty);
    if (options?.type) params.set('type', options.type);
    if (this.token) params.set('token', this.token);

    const url = `https://opentdb.com/api.php?${params.toString()}`;

    const data = (await axios.get(url)).data as TriviaResponse;

    switch (data.response_code) {
      case 4: // questions exhaused
        await this.resetToken();
        return this.fetchQuestion(options);
      case 3: // token expired
        await this.requestToken();
        return this.fetchQuestion(options);
      case 2: // invalid category
        throw new Error('invalid category');
      case 1: // too many questions asked, should never happen
        throw new Error(
          `Unexpected response code 1\nURL: ${url.replace(
            new RegExp(this.token ?? '§', 'g'),
            '[TOKEN]'
          )}`
        );
      case 0:
        return data;
    }
  }

  private async sendQuestion(question: TriviaResponse, context: Context): Promise<void> {
    const { msg } = context;

    if (question.response_code !== 0)
      throw new Error(`sendQuestion called with question with code ${question.response_code}`);

    const data = question.results[0];
    const embed = new Embed();
    const answers =
      data.type === 'boolean'
        ? ['True', 'False']
        : _.shuffle([data.correct_answer, ...data.incorrect_answers]);

    const answerLetters = alphabet.slice(0, answers.length).split('');
    const formattedAnswers = answers.map(
      (res, index) => `**${alphabet[index].toUpperCase()}.** ${sanitize(he.decode(res))}`
    );

    const correctIndex = answers.findIndex(res => res === data.correct_answer)!;
    embed.setDescription(formattedAnswers.join('\n'));

    if (data.type === 'boolean') {
      embed.setTitle(`True or false: ${he.decode(data.question)}`);
      embed.addField('Type', 'True/False', true);
    } else {
      embed.setTitle(he.decode(data.question));
      embed.addField('Type', 'Multiple Choice', true);
    }

    embed.addField('Difficulty', _.capitalize(data.difficulty), true);
    embed.addField('Category', he.decode(data.category), true);
    embed.addField('Time Limit', '15s');

    process.env.NODE_ENV === 'development' &&
      embed.setFooter(`Correct answer: ${data.correct_answer}`);

    const message = await msg.channel.send(msg.author, embed);

    const collector = message.channel.createMessageCollector(
      (m: Message) =>
        (m.author.id === msg.author.id &&
          answers.some(a => a.toLowerCase() === m.content.toLowerCase())) ||
        answerLetters.includes(m.content.toLowerCase()),
      { dispose: true, time: 15000 }
    );

    collector.on('collect', message => {
      const content = message.content.toLowerCase();
      if (answerLetters.includes(content)) {
        // a, b, c, d
        if (alphabet[correctIndex] !== content) collector.stop('incorrect');
        else collector.stop('correct');
      } else {
        const index = answers.findIndex(a => a.toLowerCase() === message.content.toLowerCase());

        if (index !== correctIndex) collector.stop('incorrect');
        else collector.stop('correct');
      }
    });

    collector.on('end', (__, reason) => {
      if (reason === 'incorrect')
        return msg.channel.send(
          msg.author,
          Embed.error(`Incorrect! The correct answer was ${formattedAnswers[correctIndex]}.`)
        );

      if (reason === 'correct') return msg.channel.send(msg.author, Embed.success('Correct!'));

      return msg.channel.send(
        msg.author,
        Embed.error(`Time's up! The correct answer was **${data.correct_answer}**.`)
      );
    });
  }
}
