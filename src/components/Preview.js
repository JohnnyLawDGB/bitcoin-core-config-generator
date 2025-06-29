/* global Blob */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './Preview.css';

import { joinPath, basePath } from '../system';
import data from '../data.json';
// TODO [ToDr] move to some common?
import {fillDescription} from './Editor';

class Preview extends Component {
  static propTypes = {
    settings: PropTypes.object.isRequired,
    defaults: PropTypes.object.isRequired
  };

  generateConfig = () => {
    const {settings, defaults} = this.props;
    const data = toConf(settings, defaults);
    const filename = 'digibyte.conf';
    const blob = new Blob([data], {type: 'text/plain'});
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      const elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  }

  render () {
    const {settings, defaults} = this.props;
    return (
      <div className='mdl-card mdl-shadow--2dp preview-card'>
        <div className='mdl-card__title'>
          <div className='preview-title mdl-card__title-text'>
            digibyte.conf
          </div>
        </div>
        <div className='mdl-card__actions mdl-card--border'>
          <textarea className='preview-editor' readOnly value={toConf(settings, defaults)} />
        </div>
        <div className='mdl-card__menu'>
          <a
            className='mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-efect'
            target='_blank'
            href={window.location.toString()}>
            <i className='material-icons' id='link'>link</i>
            <span className='mdl-tooltip' htmlFor='link'>Link to this Config File</span>
          </a>
          <button
            className='mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-efect'
            onClick={this.generateConfig}>
            <i className='material-icons' id='download'>cloud download</i>
            <span className='mdl-tooltip' htmlFor='download'>Download Config File</span>
          </button>
        </div>
      </div>
    );
  }
}

function toConf (settings, defaults) {
  const conf = Object.keys(settings)
    .filter(section => section !== '__internal')
    .reduce((acc, section) => {
      // for old configs the section might be missing in defaults
      defaults[section] = defaults[section] || {};

      const vals = Object.keys(settings[section])
        .filter(key => !isEqual(settings[section][key], defaults[section][key]))
        .map(key => {
          const val = settings[section][key];
          if (val === undefined || val.length === 0) {
            return '';
          }
          const comment = toComment(settings, section, key, val);
          const setting = `${toLine(key, val)}`;
          return `# ${comment}\n${setting}`;
        })
        .filter(val => val !== '');

      if (vals.length > 0) {
        acc.push(`\n# [${section}]`);
      }

      return acc.concat(vals);
    }, []);

  if (!conf.length) {
    conf.push(
      '',
      '',
      '# All values are currently set to defaults. Config is not needed.'
    );
  } else {
    conf.push(
      '',
      '',
      '# [Sections]',
      '# Most options automatically apply to mainnet, testnet, and regtest networks.',
      '# If you want to confine an option to just one network, you should add it in the relevant section.',
      '# EXCEPTIONS: The options addnode, connect, port, bind, rpcport, rpcbind and wallet',
      '# only apply to mainnet unless they appear in the appropriate section below.',
      '',
      '# Options only for mainnet',
      '[main]',
      '',
      '# Options only for testnet',
      '[test]',
      '',
      '# Options only for regtest',
      '[regtest]'
    );
  }

  const { platform } = settings.__internal || defaults.__internal;
  const configPath = joinPath([basePath(platform), 'digibyte.conf'], platform);
  conf.unshift(
    '# Generated by https://jlopp.github.io/digibyte-core-config-generator/\n',
    '# This config should be placed in following path:',
    `# ${configPath}`
  );

  return conf.join('\n');
}

function isEqual (a, b) {
  return Object.is(a, b);
}

function toComment (settings, section, key, value) {
  // for old configs the section might be missing in defaults
  data[section] = data[section] || {};
  data[section][key] = data[section][key] || {};

  if (typeof data[section][key].description === 'object') {
    if (value === undefined || value.length === 0) {
      return;
    }
    var description = fillDescription(data[section][key].description, value);
    // add a # after each newline except the last
    description = description.replace(/(\n)/gm, '\n# ');
    return description;
  }
  return fillDescription(data[section][key].description, value);
}

function toLine (key, val) {
  if (typeof val === 'boolean') {
    return `${key}=${val}`;
  }

  if (typeof val === 'number') {
    return `${key}=${val}`;
  }

  // multi-select values should each get their own line in the conf file
  if (Array.isArray(val)) {
    var formatted = '';
    for (var i in val) {
      if ({}.hasOwnProperty.call(val, i)) {
        formatted += toLine(key, val[i]) + '\n';
      }
    }
    return formatted;
  }

  // Escape windows paths
  val = val ? val.replace(/\\([^\\])/g, '\\\\$1') : val;
  // Escape spaces in paths
  val = val.replace(/ /g, '\\ ');
  return `${key}=${val}`;
}

export default Preview;
