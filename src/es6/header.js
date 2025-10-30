import React from 'react';

class Header extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      tempF: null,
      dateStr: this.formatDate(new Date()),
      timeStr: this.formatTime(new Date())
    };
    this.updateTime = this.updateTime.bind(this);
    this.updateTemp = this.updateTemp.bind(this);
  }
  componentDidMount(){
    this.updateTime();
    this.updateTemp();
    this._clock = setInterval(this.updateTime, 1000);
    // refresh temp every 15 minutes
    this._temp = setInterval(this.updateTemp, 15 * 60 * 1000);
  }
  componentWillUnmount(){
    if (this._clock) clearInterval(this._clock);
    if (this._temp) clearInterval(this._temp);
  }
  pad2(n){ return (n<10? '0':'') + n; }
  formatDate(d){
    try {
      const mm = d.getMonth() + 1;
      const dd = d.getDate();
      const yy = ('' + d.getFullYear()).slice(-2);
      return `${mm}/${dd}/${yy}`;
    } catch(e){ return ''; }
  }
  formatTime(d){
    try {
      let h = d.getHours();
      const m = this.pad2(d.getMinutes());
      const s = this.pad2(d.getSeconds());
      const ampm = h < 12 ? 'AM' : 'PM';
      h = ((h + 11) % 12) + 1; // 12-hour, 1-12
      return `${h}:${m}:${s} ${ampm}`;
    } catch(e){ return ''; }
  }
  updateTime(){
    const now = new Date();
    const dateStr = this.formatDate(now);
    const timeStr = this.formatTime(now);
    if (dateStr !== this.state.dateStr || timeStr !== this.state.timeStr) {
      this.setState({ dateStr, timeStr });
    }
  }
  updateTemp(){
    if (!navigator.geolocation) {
      this.setState({ tempF: null });
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&temperature_unit=fahrenheit`;
      fetch(url)
        .then(r => r.json())
        .then(json => {
          const curr = (json && json.current) || {};
          const temp = typeof curr.temperature_2m !== 'undefined' ? Math.round(curr.temperature_2m) : null;
          this.setState({ tempF: temp });
        })
        .catch(() => this.setState({ tempF: null }));
    }, () => this.setState({ tempF: null }));
  }
  render() {
    const { tempF, dateStr, timeStr } = this.state;
    return(
        <div className="header">
          <div className="stats">
            <div className="separator left-side">
            </div>
            <div className="title">{this.props.activeCategory.name}</div>
            <div className="separator right-side">
            </div>
          </div>
          <div className="hp">
            <div className="label">
              TEMP
            </div>
            <div className="value">
              {tempF === null ? 'N/A' : `${tempF} F`}
            </div>
          </div>
          <div className="ap">
            <div className="label">
              DATE
            </div>
            <div className="value">
              {dateStr}
            </div>
          </div>
          <div className="xp">
            <div className="label">
              TIME
            </div>
            <div className="value">
              {timeStr}
            </div>
          </div>
        </div>
    );
  }
}

export default Header;
