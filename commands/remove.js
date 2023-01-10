const {
    SlashCommandBuilder
  } = require('@discordjs/builders');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('remove')
      .setDescription('Удалить кого-либо из тикет-чата')
      .addUserOption(option =>
        option.setName('target')
        .setDescription('Участник, которого нужно удалить из тикет-чата')
        .setRequired(true)),
    async execute(interaction, client) {
      const chan = client.channels.cache.get(interaction.channelId);
      const user = interaction.options.getUser('target');
      if (!interaction.member.roles.cache.find(r => r.id === client.config.roleSupport)) return interaction.reply({content: "Вы должны иметь <@&" + client.config.roleSupport + "> роль.", ephemeral: true})
      if (chan.name.includes('ticket')) {
        chan.edit({
          permissionOverwrites: [{
            id: user,
            deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: interaction.guild.roles.everyone,
            deny: ['VIEW_CHANNEL'],
          },
          {
            id: client.config.roleSupport,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
        ],
        }).then(async () => {
          interaction.reply({
            content: `<@${user.id}> был удален из тикет-чата!`
          });
        });
      } else {
        interaction.reply({
          content: 'Вы не в тикет чате!',
          ephemeral: true
        });
      };
    },
  };
  