(function() {
	'use strict';

	var channels = [];
	var notification;

	/*
	 * OPTIONS
	 * userName = channel
	 * key = https://www.livecoding.tv/rss/USERNAME/followed/?key=KEY
	 * useNotifications = popup chrome notification when followed streams goes live.
	 */
	var userName = '';
	var key = '';
	var useNotifications = false;

	$(document).ready(function() {
		getLiveChannels();
		updateStreams();

		$('body').on('click', 'td', function() {
			chrome.tabs.create({
				url: 'https://www.livecoding.tv/' + $(this).attr('channel')
			});
			return false;
		});

		$('.btn-update').click(function() {
			getLiveChannels();
		});
	});

	function getLiveChannels() {
		$.ajax({
			url: 'https://www.livecoding.tv/rss/' + userName + '/followed/?key=' + key,
			cache: false
		}).done(function(data) {
			var tmp = xml2json(data);

			$.each(tmp.rss.channel.item, function(key, value) {
				if (isLive(value.description)) {
					if ($.inArray(value.title, channels) === -1) {
						channels.push(value.title);
						
						if (useNotifications)
							setNotificationOptions(value.title);
					}
				} else {
					if ($.inArray(value.title, channels) !== -1) {
						channels.splice(channels.indexOf(value.title, 1));
					}
				}
			});

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
			var color = [190, 190, 190, 230];

			updateBadge(text, color);
		});
	}

	function updateStreams() {
		setInterval(function() {
			getLiveChannels();
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

	function updateBadge(str, color) {
		chrome.browserAction.setBadgeBackgroundColor({
			color: color
		});

		chrome.browserAction.setBadgeText({
			text: str
		});
	}


	function setNotificationOptions(channelName) {
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

	function isLive(str) {
		return str.indexOf('on air') !== -1;
	}
})();