(function() {
	'use strict';

	var channels = [];
	var notification;

	/*
	 * OPTIONS
	 * userName = channel
	 * key = https://www.livecoding.tv/rss/USERNAME/followed/?key=KEY
	 * useNotifications = popup chrome notification when followed streams goes live. (true/false)
	 */
	var userName = '';
	var key = '';
	var useNotifications = false;

	$(document).ready(function() {
		getLiveChannels();
		updateStreams();

		$('body').on('click', 'td', function() {
			if ($('tr').hasClass('offline') !== true) {
				chrome.tabs.create({
					url: 'https://www.livecoding.tv/' + $(this).attr('channel')
				});
				return false;
			}
		});

		$('.btn-update').bind('click', getLiveChannels);
	});

	function getLiveChannels() {
		$.ajax({
			url: 'https://www.livecoding.tv/rss/' + userName + '/followed/?key=' + key,
			cache: false
		})
		.done(function(data) {
			var tmp = xml2json(data);

			parseChannelData(tmp.rss.channel.item);

			if (channels.length === 0 && $('tr').hasClass('offline') !== true) {
				$('<tr />').addClass('offline').appendTo('tbody');
				$('.offline').html('<td colspan="2">There is no followed channels live!</td>');
			} else {
				$.each(channels, function(key, value) {
					if ($('tr').hasClass(value) !== true) {
						$('<tr />').addClass(value).appendTo('tbody');
						$('.' + value).html('<td colspan="2" channel="' + value + '">' + value + '</td>');
					}
				});
			}

			var text = '' + channels.length;

			updateBadge(text);
		});
	}

	function parseChannelData(data) {
		$.each(data, function(key, value) {
			var channelName = value.title;
			var channelStatus = value.description;

			if (isLive(channelStatus)) {
				if ($.inArray(channelName, channels) === -1) {
					addNewChannel(channelName);
					
					if (useNotifications)
						showNotification(channelName);
				}
			} else {
				if ($.inArray(channelName, channels) !== -1)
					removeChannel(channelName);
			}
		});
	}

	function updateStreams() {
		setInterval(function() {
			getLiveChannels();
			console.warn('New data requested');
		}, 5000);
	}

	function xml2json(xml) {
		try {
			var obj = {};

			if (xml.children.length > 0) {
				for (var i = 0; i < xml.children.length; i++) {
					var item = xml.children.item(i);
					var nodeName = item.nodeName;

					if (typeof(obj[nodeName]) == "undefined") {
						obj[nodeName] = xml2json(item);
					} else {
						if (typeof(obj[nodeName].push) == "undefined") {
							var old = obj[nodeName];

							obj[nodeName] = [];
							obj[nodeName].push(old);
						}
						obj[nodeName].push(xml2json(item));
					}
				}
			} else {
				obj = xml.textContent;
			}
			return obj;
		} catch (e) {
			console.log(e.message);
		}
	}

	function updateBadge(str) {
		chrome.browserAction.setBadgeBackgroundColor({
			color: [190, 190, 190, 230]
		});

		chrome.browserAction.setBadgeText({
			text: str
		});
	}


	function showNotification(channelName) {
		var options = {
			title: 'LCTV - Live Channels',
			priority: 0,
			iconUrl: chrome.extension.getURL('img/lctvdark64.png'),
			message: 'New Livecoding.tv channel is live:\n',
			type: 'basic'
		};

		options.message += channelName;

		chrome.notifications.create('', options, onNotification);
	}

	function onNotification(notificationId) {
		notification = notificationId;
	}

	function addNewChannel(channel) {
		channels.push(channel);
	}

	function removeChannel(channel) {
		channels.splice(channels.indexOf(channel, 1));
	}

	function isLive(str) {
		return str.indexOf('on air') !== -1;
	}
})();