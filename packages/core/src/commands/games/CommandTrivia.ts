import { codeBlock } from '@discordjs/builders';
import { Embed, sanitize } from '@gamerbot/util';
import axios from 'axios';
import { Message, MessageActionRow, MessageButton } from 'discord.js';
import he from 'he';
import _ from 'lodash';
import { getLogger } from 'log4js';
import { ChatCommand, CommandDocs, CommandOptions } from '..';
import { APIMessage, CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

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

// const triviaTypeAliases = {
//   boolean: ['boolean', 'truefalse', 'tf', 'yesno', 'yn'],
//   multiple: ['multiple', 'multiplechoice', 'mc', 'choice'],
// };

// const triviaDifficultyAliases = {
//   easy: ['1', 'easy', 'ez'],
//   medium: ['2', 'medium', 'md'],
//   hard: ['3', 'hard', 'difficult'],
// };

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

export const ongoingTriviaQuestions = new Set<string>();

export class CommandTrivia extends ChatCommand {
  name = ['trivia', 'triv', 'tr'];
  // yargs: yargsParser.Options = {
  //   alias: { categories: ['c', 'category'], difficulty: 'd', type: 't' },
  //   string: ['categories', 'difficulty', 'type'],
  // };
  help: CommandDocs = [
    {
      usage: 'trivia [-c, --category <id>] [-d, --difficulty <difficulty>] [-t, --type <type>] ',
      description: 'play trivia, optional category',
    },
    {
      usage: 'trivia -c, --categories',
      description: 'display categories',
    },
  ];

  data: CommandOptions = {
    description: 'Answer a trivia question',
  };

  private token?: string;
  constructor() {
    super();
    client.on('ready', async () => {
      this.requestToken();
    });
  }

  async execute(event: CommandEvent): Promise<void | Message | APIMessage> {
    // const options: TriviaOptions = {};

    // try {
    //   msg.channel.startTyping();

    // if (args.categories === '' || args.categories === true) {
    //   const res = await axios.get('https://opentdb.com/api_category.php');
    //   const { trivia_categories: categories } = res.data as CategoriesResponse;

    //   const categoryText = categories.map(({ id, name }) => `${id}: ${name}`).join('\n');

    //   const embed = new Embed({
    //     title: 'Trivia Categories',
    //     description:
    //       '(Use the numerical ID when specifying a category)\n' + codeBlock(categoryText),
    //   });

    //   embed.reply(msg);
    //   return;
    // } else if (args.categories !== undefined) {
    //   if (!/^\d+$/.test(args.categories)) return Embed.error('Invalid category ID').reply(msg);

    //   options.category = args.categories;
    // }
    // } catch (err) {
    //   Embed.error('Error fetching question', codeBlock(err)).reply(msg);
    // }

    // if (args.type !== undefined) {
    //   const type = args.type.toLowerCase();
    //   const normalizedType = Object.keys(triviaTypeAliases).find(k =>
    //     triviaTypeAliases[k].find(keyword => type === keyword || keyword.includes(type))
    //   );

    //   if (!normalizedType) return Embed.error('Invalid type').reply(msg);

    //   options.type = normalizedType;
    // }

    // if (args.difficulty !== undefined) {
    //   const diff = args.difficulty.toLowerCase();
    //   const normalizedDiff = Object.keys(triviaDifficultyAliases).find(k =>
    //     triviaDifficultyAliases[k].find(keyword => diff === keyword || keyword.includes(diff))
    //   );

    //   if (!normalizedDiff) return Embed.error('Invalid difficulty').reply(msg);

    //   options.difficulty = normalizedDiff;
    // }

    await event.defer();

    try {
      const question = await this.fetchQuestion();

      this.sendQuestion(question, event);
    } catch (err) {
      if (err.message.includes('invalid category'))
        return event.editReply(Embed.error('Invalid category').ephemeral());

      return event.editReply(Embed.error(codeBlock(err)).ephemeral());
    }
  }

  private async requestToken(): Promise<boolean> {
    const data = (await axios.get('https://opentdb.com/api_token.php?command=request'))
      .data as TokenRequestResponse;
    if (data.response_code !== 0) {
      getLogger('CommandTrivia#requestToken').error(
        `failed retrieving trivia session token! message: ${data.response_message}`
      );
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
      getLogger('CommandTrivia#resetToken').warn(
        `failed resetting trivia session token! getting new one instead`
      );
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

  private async sendQuestion(question: TriviaResponse, event: CommandEvent): Promise<void> {
    if (question.response_code !== 0)
      throw new Error(`sendQuestion called with question with code ${question.response_code}`);

    ongoingTriviaQuestions.add(event.user.id);

    const data = question.results[0];
    const embed = new Embed();
    const answers = (
      data.type === 'boolean'
        ? ['True', 'False']
        : _.shuffle([data.correct_answer, ...data.incorrect_answers])
    ).map(str => he.decode(str));

    const answerLetters = alphabet.slice(0, answers.length).split('');
    const formattedAnswers = answers.map(
      (res, index) => `**${alphabet[index].toUpperCase()}.** ${sanitize(he.decode(res))}`
    );

    const correctIndex = answers.findIndex(res => res === he.decode(data.correct_answer))!;
    embed.setDescription(formattedAnswers.join('\n'));

    const decodedQuestion = he.decode(data.question);
    if (data.type === 'boolean') {
      embed.setTitle(
        decodedQuestion.includes('?') ? decodedQuestion : `True or false: ${decodedQuestion}`
      );
    } else {
      embed.setTitle(decodedQuestion);
    }

    embed.addField('Difficulty', _.capitalize(data.difficulty), true);
    embed.addField('Category', he.decode(data.category), true);
    embed.addField('Time Limit', '15s');

    client.devMode &&
      embed.setFooter(
        `Correct answer: ${answerLetters[correctIndex].toUpperCase()}: ${answers[correctIndex]}`
      );

    const row = new MessageActionRow({
      components: (data.type === 'boolean'
        ? ['True', 'False']
        : answerLetters.map(c => c.toUpperCase())
      ).map(
        text =>
          new MessageButton({
            label: text,
            style: 'PRIMARY',
            customId: text[0].toLowerCase(),
          })
      ),
    });

    await event.editReply({ embeds: [embed], components: [row] });
    const reply = event.channel.messages.cache.get((await event.fetchReply()).id)!;

    const collector = reply.createMessageComponentCollector({
      dispose: true,
      time: 15000,
      filter: interaction => interaction.user.id === event.user.id,
    });

    collector.on('collect', interaction => {
      const id = interaction.customId;

      if (data.type === 'boolean' && ['t', 'f'].includes(id)) {
        // handle special case of t or f
        if (id === answers[correctIndex][0].toLowerCase()) collector.stop('correct');
        else collector.stop('incorrect');
      } else if (answerLetters.includes(id)) {
        // a, b, c, d
        if (alphabet[correctIndex] !== id) collector.stop('incorrect');
        else collector.stop('correct');
      } else {
        collector.stop('incorrect');
      }
    });

    collector.on('end', (collected, reason) => {
      const id = _.capitalize(collected.first()?.customId ?? '');

      const formattedId = id === 'T' ? 'True' : id === 'F' ? 'False' : id;

      let responseEmbed: Embed;
      if (reason === 'incorrect') {
        responseEmbed = Embed.error(
          `${formattedId} is incorrect! The correct answer was **${alphabet[
            correctIndex
          ].toUpperCase()}**: **${
            data.type === 'boolean'
              ? answers[correctIndex].toLowerCase()
              : sanitize(answers[correctIndex])
          }**.`
        );
      } else if (reason === 'correct') {
        responseEmbed = Embed.success(`${formattedId} is correct!`);
      } else {
        responseEmbed = Embed.error(
          `Time's up! The correct answer was **${alphabet[correctIndex].toUpperCase()}**: **${
            data.correct_answer
          }**.`
        );
      }

      event.followUp(responseEmbed);
      event.editReply({ embeds: [embed], components: [] });

      ongoingTriviaQuestions.delete(event.user.id);
    });
  }
}
