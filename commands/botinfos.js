const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Дает информацию о боте.'),
  async execute(interaction, client) {
    const embed = new client.discord.MessageEmbed()
      .setColor('7b277c')
      .setDescription('Developed with the 💜 by `•ナスティア大好き#4595`\n\n[`Discord`](https://discord.gg/YkpXD2pm9S)')
      .setFooter(client.user.tag, client.user.avatarURL())
      .setTimestamp();
    await interaction.reply({
      embeds: [embed]
    });
  },
};