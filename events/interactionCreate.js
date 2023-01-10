const { getPasteUrl, PrivateBinClient } = require('@agc93/privatebin');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    if (interaction.customId == "open-ticket") {
      if (client.guilds.cache.get(interaction.guildId).channels.cache.find(c => c.topic == interaction.user.id)) {
        return interaction.reply({
          content: 'У вас уже есть открытый тикет!',
          ephemeral: true
        });
      };

      interaction.guild.channels.create(`ticket-${interaction.user.username}`, {
        parent: client.config.parentOpened,
        topic: interaction.user.id,
        permissionOverwrites: [{
            id: interaction.user.id,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: client.config.roleSupport,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: interaction.guild.roles.everyone,
            deny: ['VIEW_CHANNEL'],
          },
        ],
        type: "GUILD_TEXT",
      }).then(async c => {
        interaction.reply({
          content: `Билет создан! <#${c.id}>`,
          ephemeral: true
        });

        const embed = new client.discord.MessageEmbed()
          .setColor('7b277c')
          .setAuthor(`${interaction.user.username}'s Ticket`, 'https://i.imgur.com/oO5ZSRK.png')
          .setDescription('Выберите категорию вашего билета')
          .setFooter(`${client.user.tag}`, client.user.displayAvatarURL())
          .setTimestamp();

        const row = new client.discord.MessageActionRow()
          .addComponents(
            new client.discord.MessageSelectMenu()
            .setCustomId('category')
            .setPlaceholder('Выберите категорию билета')
            .addOptions([{
                label: "Support",
                value: "Support",
                emoji: '💸',
              },
              {
                label: "Offers",
                value: "Offers",
                emoji: '⚠',
              },
            ]),
          );

        msg = await c.send({
          content: `<@!${interaction.user.id}>`,
          embeds: [embed],
          components: [row]
        });

        const collector = msg.createMessageComponentCollector({
          componentType: 'SELECT_MENU',
          time: 20000 //20 seconds
        });

        collector.on('collect', i => {
          if (i.user.id === interaction.user.id) {
            if (msg.deletable) {
              msg.delete().then(async () => {
                const embed = new client.discord.MessageEmbed()
                  .setColor('7b277c')
                  .setAuthor('Ticket',  interaction.user.displayAvatarURL())
                  .setDescription(`<@!${interaction.user.id}> Создал тикет относительно \`${i.values[0]}\``)
                  .setFooter(`${client.user.tag}`, client.user.displayAvatarURL())
                  .setTimestamp();

                const row = new client.discord.MessageActionRow()
                  .addComponents(
                    new client.discord.MessageButton()
                    .setCustomId('close-ticket')
                    .setLabel('Закрыть')
                    .setEmoji('✖')
                    .setStyle('DANGER'),
                  );

                const opened = await c.send({
                  content: `<@&${client.config.roleSupport}>`,
                  embeds: [embed],
                  components: [row]
                });

                opened.pin().then(() => {
                  opened.channel.bulkDelete(1);
                });
              });
            };
          };
        });

        collector.on('end', collected => {
          if (collected.size < 1) {
            c.send(`Категория не выбрана. Закрытие тикета...`).then(() => {
              setTimeout(() => {
                if (c.deletable) {
                  c.delete();
                };
              }, 5000);
            });
          };
        });
      });
    };

    if (interaction.customId == "close-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);
      const chan = guild.channels.cache.get(interaction.channelId);

      const row = new client.discord.MessageActionRow()
        .addComponents(
          new client.discord.MessageButton()
          .setCustomId('confirm-close')
          .setLabel('Закрыть')
          .setStyle('DANGER'),
          new client.discord.MessageButton()
          .setCustomId('no')
          .setLabel('Отмена')
          .setStyle('SECONDARY'),
        );

      const verif = await interaction.reply({
        content: 'Вы уверены, что хотите закрыть тикет?',
        components: [row]
      });

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: 'BUTTON',
        time: 10000
      });

      collector.on('collect', i => {
        if (i.customId == 'confirm-close') {
          interaction.editReply({
            content: `Билет закрыт <@!${interaction.user.id}>`,
            components: []
          });

          chan.edit({
              name: `closed-${chan.name}`,
              permissionOverwrites: [
                {
                  id: client.users.cache.get(chan.topic),
                  deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                },
                {
                  id: client.config.roleSupport,
                  allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                },
                {
                  id: interaction.guild.roles.everyone,
                  deny: ['VIEW_CHANNEL'],
                },
              ],
            })
            .then(async () => {
              const embed = new client.discord.MessageEmbed()
                .setColor('7b277c')
                .setAuthor('Ticket', 'https://cdn.discordapp.com/attachments/1009582318836527125/1062445452097761381/ticket.png')
                .setDescription('```Сводка тикета```')
                .setFooter( `${client.user.tag} `, client.user.displayAvatarURL())
                .setTimestamp();

              const row = new client.discord.MessageActionRow()
                .addComponents(
                  new client.discord.MessageButton()
                  .setCustomId('delete-ticket')
                  .setLabel('Удалить')
                  .setEmoji('🗑️')
                  .setStyle('DANGER'),
                );

              chan.send({
                embeds: [embed],
                components: [row]
              });
            });

          collector.stop();
        };
        if (i.customId == 'no') {
          interaction.editReply({
            content: 'Aborting closure!',
            components: []
          });
          collector.stop();
        };
      });

      collector.on('end', (i) => {
        if (i.size < 1) {
          interaction.editReply({
            content: 'Aborting closure!',
            components: []
          });
        };
      });
    };

    if (interaction.customId == "delete-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);
      const chan = guild.channels.cache.get(interaction.channelId);

      interaction.reply({
        content: 'Сохранение сообщений...'
      });

      chan.messages.fetch().then(async (messages) => {
        let a = messages.filter(m => m.author.bot !== true).map(m =>
          `${new Date(m.createdTimestamp).toLocaleString('en-EN')} - ${m.author.username}#${m.author.discriminator}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`
        ).reverse().join('\n');
        if (a.length < 1) a = "Nothing"
        var paste = new PrivateBinClient("https://privatebin.net/");
        var result = await paste.uploadContent(a, {uploadFormat: 'markdown'})
            const embed = new client.discord.MessageEmbed()
              .setAuthor('Ticket Logs', 'https://cdn.discordapp.com/attachments/1009582318836527125/1062445452097761381/ticket.png')
              .setDescription(`📰 Логи для тикетов \`${chan.id}\` |  <@!${chan.topic}> | закрыто <@!${interaction.user.id}>\n\nLogs: [**Жмак**](${getPasteUrl(result)})`)
              .setColor('2f3136')
              .setFooter("Этот лог будет удален через 24 часа!")
              .setTimestamp();

            const embed2 = new client.discord.MessageEmbed()
              .setAuthor('Ticket Logs','https://cdn.discordapp.com/attachments/1009582318836527125/1062445452097761381/ticket.png')
              .setDescription(`📰 Логи для тикетов \`${chan.id}\`: [**Жмак**](${getPasteUrl(result)})`)
              .setColor('2f3136')
              .setFooter("Этот лог будет удален через 24 часа!")
              .setTimestamp();

            client.channels.cache.get(client.config.logsTicket).send({
              embeds: [embed]
            }).catch(() => console.log("Ticket log channel not found."));
            chan.send('Удаление канала...');

            setTimeout(() => {
              chan.delete();
            }, 5000);
          });
    };
  },
};
