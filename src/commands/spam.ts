import { Message } from "discord.js";
import { Command } from ".";
import { CmdArgs } from "../types";

export class CommandSpam implements Command {
  cmd = "spam";
  docs = {
    usage: "spam <text> [reps=5|fill] [msgs=4]",
    description: "ok",
  };
  async executor(cmdArgs: CmdArgs): Promise<void | Message> {
    const { msg, args, configStore } = cmdArgs;

    if (!configStore.get(msg.guild?.id as string).allowSpam) {
      return msg.channel.send('spam commands are off');
    }

    const prefix = configStore.get(msg.guild?.id ?? "").prefix ?? "$";

    if (!args[0])
      return msg.channel.send(
        `no text to send\nusage: \`${prefix}${this.docs.usage}\``
      );
    if (args[1] && args[1] !== "fill" && isNaN(parseInt(args[1])))
      return msg.channel.send("invalid repetition count");
    if (args[2] && isNaN(parseInt(args[2])))
      return msg.channel.send("invalid message count");

    let output = "";

    let spamText = args[0];
    let [_, reps, msgs] = args.map((v) => parseInt(v));

    reps ??= 5;
    msgs ??= 4;

    if (args[1] == "fill") {
      while (true) {
        if (output.length + spamText.length + 1 > 2000) break;
        output += " " + spamText;
      }
    } else {
      if ((spamText.length + 1) * reps > 2000)
        return msg.channel.send(
          'too many reps (msg is over 2000 chars), use "fill" to fill the entire message'
        );

      for (let i = 0; i < reps; i++) output += " " + spamText;
    }

    for (let i = 0; i < msgs; i++) msg.channel.send(output);
  }
}
