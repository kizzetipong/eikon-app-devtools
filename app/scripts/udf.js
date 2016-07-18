import $ from 'jquery';
import md5 from 'md5';
import moment from 'moment';

import get from 'lodash/get';

import { addHeader, createRow } from './utils/dom';

const host = window.location.hostname === 'localhost' ?
  'http://emea.apps.cp.thomsonreuters.com' : '';
const url = `${host}/apps/udf/msf`;

let socket;

const $display = $('#udf-display');
const rows = {};
const cache = {};

const getHeaders = (responseHeadersString) => {
  const rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg;
  let match;
  let responseHeaders = {};
  while ((match = rheaders.exec(responseHeadersString))) {
    responseHeaders[match[1]] = match[2];
  }

  return responseHeaders;
};

const columns = [
  { name: '', field: 'timestamp' },
  { name: 'Service', field: 'serviceName' },
  { name: 'Transaction ID', field: 'transactionId' },
  { name: 'Backend', field: 'backend' },
  { name: 'Time', headerTooltip: 'in milliseconds', field: 'timeSpent', classNames: 'text-right' },
  { name: 'Size', headerTooltip: 'in bytes', field: 'size', classNames: 'text-right' },
];

addHeader('udf-head', columns);

const updateRow = (id, data) => {
  let row = rows[id];
  let d = row.data;
  Object.assign(d, data);
  let $td = row.el.children();

  if (d.start && d.stop) d.timeSpent = d.stop - d.start;

  columns.forEach((col, i) => {
    $($td.get(i)).text(d[col.field] || '');
  });

  if (d.cache) $($td.get(2)).html('<i>send cache</i>');
};

const addRow = (id) => {
  let $row = $(createRow(columns));
  $display.prepend($row);
  rows[id] = { el: $row, data: {} };
  updateRow(id);
};

const udf = {
  init(_socket) {
    socket = _socket;

    socket.on('udf-request', (id, headers, body, options) => {
      let useCache = get(options, 'cache');
      let cacheKey;
      let serviceName = body.entity || body.Entity || {};
      serviceName = serviceName.e || serviceName.E || 'batch';

      addRow(id);
      updateRow(id, {
        timestamp: moment().format('HH:mm:ss.SSS'),
        serviceName,
        start: new Date().getTime(),
      });

      if (useCache && /dapsfile/i.test(serviceName)) {
        useCache = false;
      }

      if (useCache) {
        cacheKey = md5(JSON.stringify(body));
        if (cache[cacheKey]) {
          let { headers: resHeaders, data } = cache[cacheKey];
          updateRow(id, { cache: true });
          setTimeout(() => {
            socket.emit('udf-response', id, resHeaders, data);
          }, 300);
          return;
        }
      }

      $.ajax({
        url,
        method: 'post',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(body),
        headers: {
          'X-Tr-Applicationid': 'test',
        },
      })
      .then((data, status, xhr) => {
        let resHeaders = getHeaders(xhr.getAllResponseHeaders());
        updateRow(id, {
          stop: new Date().getTime(),
          size: resHeaders['content-length'],
          backend: resHeaders['x-tr-backend'],
          transactionId: resHeaders['x-tr-udf-transactionid'],
        });
        if (useCache) {
          cache[cacheKey] = {
            headers: resHeaders,
            data,
          };
        }
        socket.emit('udf-response', id, resHeaders, data);
      });
    });
  },
};

export default udf;
