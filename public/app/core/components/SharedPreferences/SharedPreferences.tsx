import React, { PureComponent } from 'react';
import { css } from '@emotion/css';

import {
  Button,
  Field,
  FieldSet,
  Form,
  Icon,
  Label,
  RadioButtonGroup,
  Select,
  stylesFactory,
  TimeZonePicker,
  Tooltip,
} from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { DashboardSearchHit, DashboardSearchItemType } from 'app/features/search/types';
import { UserPreferencesDTO } from 'app/types/preferences';
import { backendSrv } from 'app/core/services/backend_srv';
import config from 'app/core/config';
import { PreferencesService } from 'app/core/services/PreferencesService';

export interface Props {
  resourceUri: string;
}

export interface State {
  homeDashboardId: number;
  navPosition: UserPreferencesDTO['navPosition'];
  theme: string;
  timezone: string;
  dashboards: DashboardSearchHit[];
}

const themes: SelectableValue[] = [
  { value: '', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const navPositions: Array<SelectableValue<string>> = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
];

export class SharedPreferences extends PureComponent<Props, State> {
  service: PreferencesService;

  constructor(props: Props) {
    super(props);

    this.service = new PreferencesService(props.resourceUri);
    this.state = {
      homeDashboardId: 0,
      navPosition: '',
      theme: '',
      timezone: '',
      dashboards: [],
    };
  }

  async componentDidMount() {
    const prefs = await this.service.load();
    const dashboards = await backendSrv.search({ starred: true });
    const defaultDashboardHit: DashboardSearchHit = {
      id: 0,
      title: 'Default',
      tags: [],
      type: '' as DashboardSearchItemType,
      uid: '',
      uri: '',
      url: '',
      folderId: 0,
      folderTitle: '',
      folderUid: '',
      folderUrl: '',
      isStarred: false,
      slug: '',
      items: [],
    };

    if (prefs.homeDashboardId > 0 && !dashboards.find((d) => d.id === prefs.homeDashboardId)) {
      const missing = await backendSrv.search({ dashboardIds: [prefs.homeDashboardId] });
      if (missing && missing.length > 0) {
        dashboards.push(missing[0]);
      }
    }

    this.setState({
      homeDashboardId: prefs.homeDashboardId,
      navPosition: prefs.navPosition,
      theme: prefs.theme,
      timezone: prefs.timezone,
      dashboards: [defaultDashboardHit, ...dashboards],
    });
  }

  onSubmitForm = async () => {
    const { homeDashboardId, navPosition, theme, timezone } = this.state;
    await this.service.update({ homeDashboardId, navPosition, theme, timezone });
    window.location.reload();
  };

  onNavPositionChanged = (value: UserPreferencesDTO['navPosition']) => {
    this.setState({ navPosition: value });
  };

  onThemeChanged = (value: string) => {
    this.setState({ theme: value });
  };

  onTimeZoneChanged = (timezone?: string) => {
    if (!timezone) {
      return;
    }
    this.setState({ timezone: timezone });
  };

  onHomeDashboardChanged = (dashboardId: number) => {
    this.setState({ homeDashboardId: dashboardId });
  };

  getFullDashName = (dashboard: SelectableValue<DashboardSearchHit>) => {
    if (typeof dashboard.folderTitle === 'undefined' || dashboard.folderTitle === '') {
      return dashboard.title;
    }
    return dashboard.folderTitle + ' / ' + dashboard.title;
  };

  render() {
    const { theme, navPosition, timezone, homeDashboardId, dashboards } = this.state;
    const styles = getStyles();

    return (
      <Form onSubmit={this.onSubmitForm}>
        {() => {
          return (
            <FieldSet label="Preferences">
              <Field label="UI Theme">
                <RadioButtonGroup
                  options={themes}
                  value={themes.find((item) => item.value === theme)?.value}
                  onChange={this.onThemeChanged}
                />
              </Field>

              {config.featureToggles.newNavigation && (
                <Field label="Navigation position">
                  <RadioButtonGroup
                    options={navPositions}
                    value={navPositions.find((item) => item.value === navPosition)?.value}
                    onChange={this.onNavPositionChanged}
                  />
                </Field>
              )}

              <Field
                label={
                  <Label>
                    <span className={styles.labelText}>Home Dashboard</span>
                    <Tooltip content="Not finding dashboard you want? Star it first, then it should appear in this select box.">
                      <Icon name="info-circle" />
                    </Tooltip>
                  </Label>
                }
                aria-label="User preferences home dashboard drop down"
              >
                <Select
                  menuShouldPortal
                  value={dashboards.find((dashboard) => dashboard.id === homeDashboardId)}
                  getOptionValue={(i) => i.id}
                  getOptionLabel={this.getFullDashName}
                  onChange={(dashboard: SelectableValue<DashboardSearchHit>) =>
                    this.onHomeDashboardChanged(dashboard.id)
                  }
                  options={dashboards}
                  placeholder="Choose default dashboard"
                />
              </Field>

              <Field label="Timezone" aria-label={selectors.components.TimeZonePicker.container}>
                <TimeZonePicker includeInternal={true} value={timezone} onChange={this.onTimeZoneChanged} />
              </Field>
              <div className="gf-form-button-row">
                <Button variant="primary" aria-label="User preferences save button">
                  Save
                </Button>
              </div>
            </FieldSet>
          );
        }}
      </Form>
    );
  }
}

export default SharedPreferences;

const getStyles = stylesFactory(() => {
  return {
    labelText: css`
      margin-right: 6px;
    `,
  };
});
