import $ from 'jquery';
import moment from 'moment';

let $head;
let $display;

const eventClasses = {
  publish: 'info',
  subscribe: 'success',
};

const columns = [
  { name: '', field: 'timestamp' },
  { name: 'Event', field: 'eventName' },
  { name: 'Channel', field: 'channel' },
  { name: 'Data', field: 'data', classNames: 'word-break' },
];

const feed = {
  init(socket) {
    $head = $('#feed-head');
    $display = $('#feed-display');

    feed.createHeader();

    socket.on('publish', (channel, data) => {
      feed.addRow('publish', channel, data);
      JET.publish(channel, data);
    });

    socket.on('subscribe', (channel) => {
      JET.subscribe(channel, (result) => {
        feed.addRow('subscribe', channel, result);
        socket.emit('subscribe-success', channel, result);
      });
    });
  },

  createHeader() {
    $('<tr>')
      .append(columns.map(({ name }) => `<th>${name}</th>`))
      .appendTo($head);
  },

  addRow(eventName, channel, data = '') {
    let params = {
      timestamp: moment().format('HH:mm:ss.SSS'),
      eventName,
      channel,
      data,
    };

    let $tr = $('<tr>')
      .append(columns.map(({ field, classNames }) =>
        `<td class="${classNames}">${params[field] || ''}</td>`))
      .addClass(eventClasses[eventName] || '');
    $display.prepend($tr);
  },
};

export default feed;
