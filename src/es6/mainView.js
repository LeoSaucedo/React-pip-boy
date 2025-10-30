import React from "react";

class MainView extends React.Component {
  constructor() {
    super();
    this.state = {
      datavalue: "",
      descriptionStyle: null,
      mainViewPadBottom: 0,
      valueMaxHeight: null,
      scheduleOpen: {},
      questsChecked: {},
      radioCurrentIndex: 0,
      radioIsPlaying: false,
      radioIsLoading: false,
      radioVolume: 0.8,
      mapUrl: null,
    };
    this._radioStations = [
      {
        name: "Radio Paradise",
        url: "http://stream.radioparadise.com/aac-320",
      },
      {
        name: "Diamond City Radio",
        url: "diamond-city.mp3",
        isLocal: true,
      },
      {
        name: "Galaxy News Radio",
        url: "galaxy-news-radio.mp3",
        isLocal: true,
      },
      {
        name: "Radio New Vegas",
        url: "radio-new-vegas.mp3",
        isLocal: true,
      },
    ];
    // Cache for map images to avoid re-downloading
    this._mapCache = {};
  }
  componentDidMount() {
    this.updateDatavalue();
    // ensure auto-refresh is started if STATUS is initially active
    const activeitem = this.getActiveItem(this.props.activeCategory);
    this.manageAutoRefresh(activeitem);
    // position description after paint
    if (typeof window !== "undefined") {
      this._onResize = this.updateDescriptionOffset.bind(this);
      this._onScroll = this.updateDescriptionOffset.bind(this);
      this._onOrient = this.updateDescriptionOffset.bind(this);
      window.addEventListener("resize", this._onResize);
      window.addEventListener("scroll", this._onScroll, { passive: true });
      window.addEventListener("orientationchange", this._onOrient);
      // schedule a couple frames to ensure correct layout
      window.requestAnimationFrame(() => this.updateDescriptionOffset());
      setTimeout(() => this.updateDescriptionOffset(), 0);
    }
    this.loadQuestsState();
    this.loadRadioState();
  }
  componentDidUpdate(prevProps, prevState) {
    const activeitem = this.getActiveItem(this.props.activeCategory);
    const sig = `${this.props.activeCategory.name}::${activeitem.displayName}`;
    if (this._lastSignature !== sig) {
      this.updateDatavalue();
      // manage auto-refresh when switching active items
      this.manageAutoRefresh(activeitem);
      if (
        this.props.activeCategory.name === "DATA" &&
        activeitem.displayName === "QUESTS"
      ) {
        this.loadQuestsState();
      }
    }
    // if we are in MAP, update static map url whenever layout changes
    if (this.props.activeCategory.name === "MAP") {
      this.updateMapUrl();
    } else if (prevProps.activeCategory.name === "MAP") {
      // leaving map, clear url (optional)
      if (this.state.mapUrl) this.setState({ mapUrl: null });
    }
    // keep description pinned above the footer on any update
    this.updateDescriptionOffset();
  }
  componentWillUnmount() {
    this.stopAutoRefresh();
    if (typeof window !== "undefined" && this._onResize) {
      window.removeEventListener("resize", this._onResize);
    }
    if (typeof window !== "undefined" && this._onScroll) {
      window.removeEventListener("scroll", this._onScroll);
    }
    if (typeof window !== "undefined" && this._onOrient) {
      window.removeEventListener("orientationchange", this._onOrient);
    }
  }

  updateDatavalue() {
    let activeitem = this.getActiveItem(this.props.activeCategory);
    let self = this;
    activeitem.generateData().then((datavalue) => {
      const sig = `${self.props.activeCategory.name}::${activeitem.displayName}`;
      self._lastSignature = sig;
      self.setState({ datavalue: datavalue });
    });
  }
  getActiveItem(category) {
    return category.items.filter((item) => {
      return item.active;
    })[0];
  }
  updateDescriptionOffset() {
    if (typeof window === "undefined") return;
    const footer = document.querySelector(".footer");
    const footerInner = document.querySelector(".footer .container-bottom");
    const mainView = document.querySelector(".main-view");
    const descEl = document.querySelector(".main-view .description");
    const valueEl = document.querySelector(".main-view .value");
    if (footer && mainView) {
      const footerRect = footer.getBoundingClientRect();
      const footerInnerRect = footerInner
        ? footerInner.getBoundingClientRect()
        : footerRect;
      const mainRect = mainView.getBoundingClientRect();
      const docEl = document.documentElement || document.body;
      const viewportH = docEl.clientHeight || window.innerHeight;
      const viewportW = docEl.clientWidth || window.innerWidth;
      const GAP = 0; // no gap; sit directly above footer
      const bottom = Math.max(0, Math.round(viewportH - footerRect.top) + GAP);
      const left = Math.round(mainRect.left);
      const footerRight = footerRect.right; // match footer's outer right edge
      const rightSpace = Math.max(0, Math.round(viewportW - footerRight));
      const descHeight = descEl
        ? Math.ceil(descEl.getBoundingClientRect().height)
        : 0;
      const descTop = descEl
        ? Math.round(descEl.getBoundingClientRect().top)
        : null;
      const valueTop = valueEl
        ? Math.round(valueEl.getBoundingClientRect().top)
        : null;
      const desiredValueMax =
        descTop !== null && valueTop !== null
          ? Math.max(0, descTop - valueTop - 8)
          : null;
      // pad the main view so scrolling content doesn't go under the fixed description
      const padBottom = descHeight;
      const curr = this.state.descriptionStyle || {};
      const changed =
        curr.bottom !== bottom ||
        curr.left !== left ||
        curr.right !== rightSpace ||
        this.state.mainViewPadBottom !== padBottom ||
        (desiredValueMax !== null &&
          this.state.valueMaxHeight !== desiredValueMax);
      if (changed) {
        this.setState({
          descriptionStyle: {
            position: "fixed",
            bottom,
            left,
            right: rightSpace,
            zIndex: 2,
          },
          mainViewPadBottom: padBottom,
          valueMaxHeight: desiredValueMax,
        });
      }
    }
  }
  manageAutoRefresh(activeitem) {
    const isStatus =
      this.props.activeCategory.name === "STAT" &&
      activeitem.displayName === "STATUS";
    if (isStatus) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }
  startAutoRefresh() {
    if (this._refreshTimer) return;
    // refresh every second for live clock seconds
    this._refreshTimer = setInterval(() => {
      this.updateDatavalue();
    }, 1000);
  }
  stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }
  ensureAudio() {
    if (!this._audio && typeof Audio !== "undefined") {
      this._audio = new Audio();
      this._audio.preload = "none";
      this._audio.volume = this.state.radioVolume;
      // Removed CORS setting as it can interfere with streaming audio
      // this._audio.crossOrigin = "anonymous";

      // Add event listeners for better debugging and state management
      this._audio.addEventListener("loadstart", () => {
        console.log("Radio: Loading started");
        this.setState({ radioIsLoading: true });
      });

      this._audio.addEventListener("canplay", () => {
        console.log("Radio: Can play");
        this.setState({ radioIsLoading: false });
      });

      this._audio.addEventListener("playing", () => {
        console.log("Radio: Actually playing");
        this.setState({ radioIsPlaying: true, radioIsLoading: false });
      });

      this._audio.addEventListener("pause", () => {
        console.log("Radio: Paused");
        this.setState({ radioIsPlaying: false });
      });

      this._audio.addEventListener("error", (e) => {
        console.error("Radio: Error occurred", e);
        console.error("Radio: Error details", this._audio.error);
        this.setState({ radioIsPlaying: false, radioIsLoading: false });
      });

      this._audio.addEventListener("waiting", () => {
        console.log("Radio: Waiting for data");
        this.setState({ radioIsLoading: true });
      });
    }
    return this._audio;
  }
  loadRadioState() {
    try {
      const idx = localStorage.getItem("pipboy_radio_station_idx");
      const vol = localStorage.getItem("pipboy_radio_volume");
      const next = {};
      if (idx !== null)
        next.radioCurrentIndex = Math.max(
          0,
          Math.min(this._radioStations.length - 1, parseInt(idx, 10) || 0)
        );
      if (vol !== null)
        next.radioVolume = Math.max(0, Math.min(1, parseFloat(vol)));
      if (Object.keys(next).length) this.setState(next);
      const a = this.ensureAudio();
      if (a)
        a.volume =
          next.radioVolume !== undefined
            ? next.radioVolume
            : this.state.radioVolume;
    } catch (e) {}
  }
  selectStation(index) {
    const a = this.ensureAudio();
    if (!a) return;
    const clamped = Math.max(
      0,
      Math.min(this._radioStations.length - 1, index)
    );

    // Always update the current station index to stay in sync
    localStorage.setItem("pipboy_radio_station_idx", String(clamped));

    // Check if we're actually switching to a different station
    if (clamped !== this.state.radioCurrentIndex) {
      console.log(
        `Radio: Switching from station ${this.state.radioCurrentIndex} to ${clamped}`
      );

      const st = this._radioStations[clamped];
      const wasPlaying = this.state.radioIsPlaying;

      // Stop current playback and reset audio element
      a.pause();
      a.currentTime = 0;

      // Remove any existing event listeners to prevent conflicts
      const oldOnLoadedMetadata = a.onloadedmetadata;
      a.onloadedmetadata = null;
      a.removeEventListener("loadedmetadata", oldOnLoadedMetadata);

      // Reset audio configuration for new station
      a.loop = false; // Will be set appropriately in playRadio()
      a.src = st.url;

      // Update state to new station
      this.setState({ radioCurrentIndex: clamped, radioIsPlaying: false });

      // If radio was playing, start the new station
      if (wasPlaying) {
        // Small delay to ensure state is updated
        setTimeout(() => this.playRadio(), 50);
      }
    } else {
      // Same station clicked - just update state to ensure sync
      console.log("Radio: Same station clicked, ensuring state sync");
      this.setState({ radioCurrentIndex: clamped });
    }
  }
  playRadio() {
    const a = this.ensureAudio();
    if (!a) {
      console.error("Radio: Audio object not available");
      return;
    }

    const st = this._radioStations[this.state.radioCurrentIndex];
    console.log("Radio: Attempting to play", st);

    // Set the source if it's different
    if (st && a.src !== st.url) {
      console.log("Radio: Setting source to", st.url);
      a.src = st.url;

      // Reset any previous configuration
      a.loop = false;
      a.currentTime = 0;

      // Configure based on station type
      if (st.isLocal) {
        a.loop = true;

        // Clean up any existing metadata listeners
        const existingListeners = a.cloneNode();

        // Set up random start position when metadata loads
        const setRandomStart = () => {
          if (a.duration && a.duration > 0) {
            const randomStart = Math.random() * a.duration;
            a.currentTime = randomStart;
            console.log(
              `Radio: Starting ${st.name} at ${randomStart.toFixed(2)}s`
            );
          }
          a.removeEventListener("loadedmetadata", setRandomStart);
        };

        a.addEventListener("loadedmetadata", setRandomStart, { once: true });
      } else {
        a.loop = false;
        console.log(`Radio: Streaming ${st.name}`);
      }

      a.load(); // Force reload the audio element
    }

    // Show loading state immediately
    this.setState({ radioIsLoading: true });

    // Attempt to play with proper error handling
    const playPromise = a.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Radio: Play promise resolved successfully");
          // The 'playing' event listener will handle state updates
        })
        .catch((error) => {
          console.error("Radio: Play failed", error.name, ":", error.message);

          // Handle specific error types
          if (error.name === "NotAllowedError") {
            alert(
              "Autoplay blocked by browser. Please try clicking play again after this alert."
            );
          } else if (error.name === "NotSupportedError") {
            console.error("Radio: Audio format not supported", st);
            if (st.isLocal) {
              alert(
                `Diamond City Radio: MP3 format not supported by your browser. Please try converting the file to a different format (OGG, WAV) or use a different browser.`
              );
            } else {
              alert("Audio format not supported by your browser.");
            }
            console.log(error);
          } else if (error.name === "AbortError") {
            console.log("Radio: Play was aborted (user likely clicked pause)");
          } else {
            alert(`Audio playback failed: ${error.message}`);
          }

          this.setState({ radioIsPlaying: false, radioIsLoading: false });
        });
    } else {
      console.warn("Radio: play() did not return a promise (older browser)");
      this.setState({ radioIsLoading: false });
    }
  }
  pauseRadio() {
    if (this._audio) {
      this._audio.pause();
      console.log("Radio: Pause requested");
    }
    this.setState({ radioIsPlaying: false, radioIsLoading: false });
  }
  setRadioVolume(v) {
    const vol = Math.max(0, Math.min(1, parseFloat(v)));
    if (!isNaN(vol)) {
      if (this._audio) this._audio.volume = vol;
      localStorage.setItem("pipboy_radio_volume", String(vol));
      if (this.state.radioVolume !== vol) this.setState({ radioVolume: vol });
    }
  }
  getMapZoom() {
    const item = this.getActiveItem(this.props.activeCategory);
    if (!item) return 14;
    if (item.displayName === "LOCAL MAP") return 15;
    if (item.displayName === "WORLD MAP") return 12;
    return 14;
  }
  lonToTileX(lon, zoom) {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  }
  latToTileY(lat, zoom) {
    return Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        Math.pow(2, zoom)
    );
  }
  ensureGeo(cb) {
    if (this._geo) {
      cb(this._geo);
      return;
    }
    if (!navigator.geolocation) {
      cb(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this._geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        cb(this._geo);
      },
      () => cb(null)
    );
  }
  updateMapUrl() {
    const isMap =
      this.props.activeCategory && this.props.activeCategory.name === "MAP";
    if (!isMap) return;
    const mainView = document.querySelector(".main-view");
    const mainRect = mainView ? mainView.getBoundingClientRect() : null;
    const widthPx = mainRect
      ? Math.max(200, Math.min(1024, Math.round(mainRect.width)))
      : 600;
    const heightPx = Math.max(
      150,
      Math.min(768, Math.round(this.state.valueMaxHeight || 400))
    );
    const zoom = this.getMapZoom();
    this.ensureGeo((geo) => {
      if (!geo) {
        const url = null;
        if (this.state.mapUrl !== url) this.setState({ mapUrl: url });
        return;
      }
      // Create composite map from multiple OSM tiles
      this.createCompositeMap(geo.lat, geo.lon, zoom);
    });
  }

  createCompositeMap(lat, lon, zoom) {
    // Create cache key based on location and zoom
    const cacheKey = `${Math.round(lat * 1000)}_${Math.round(
      lon * 1000
    )}_${zoom}`;

    // Check if we already have this map cached
    if (this._mapCache[cacheKey]) {
      if (this.state.mapUrl !== this._mapCache[cacheKey]) {
        this.setState({ mapUrl: this._mapCache[cacheKey] });
      }
      return;
    }

    // Create a 2x2 grid of tiles (512x512 final image)
    const centerTileX = this.lonToTileX(lon, zoom);
    const centerTileY = this.latToTileY(lat, zoom);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const tilesNeeded = [];
    // Create 2x2 grid centered on location
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        tilesNeeded.push({
          x: centerTileX + x - 1,
          y: centerTileY + y - 1,
          canvasX: x * 256,
          canvasY: y * 256,
        });
      }
    }

    let tilesLoaded = 0;
    const totalTiles = tilesNeeded.length;

    tilesNeeded.forEach((tile) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, tile.canvasX, tile.canvasY, 256, 256);
        tilesLoaded++;

        if (tilesLoaded === totalTiles) {
          // All tiles loaded, apply dark green theme filter
          this.applyDarkGreenTheme(ctx, canvas.width, canvas.height);

          // Convert to data URL and cache it
          const compositeUrl = canvas.toDataURL("image/png");
          this._mapCache[cacheKey] = compositeUrl;

          if (this.state.mapUrl !== compositeUrl) {
            this.setState({ mapUrl: compositeUrl });
          }
        }
      };
      img.onerror = () => {
        // If a tile fails to load, still count it to prevent hanging
        tilesLoaded++;
        if (tilesLoaded === totalTiles) {
          this.applyDarkGreenTheme(ctx, canvas.width, canvas.height);
          const compositeUrl = canvas.toDataURL("image/png");
          this._mapCache[cacheKey] = compositeUrl;

          if (this.state.mapUrl !== compositeUrl) {
            this.setState({ mapUrl: compositeUrl });
          }
        }
      };
      img.src = `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;
      // img.src = `https://tiles.stadiamaps.com/tiles/stamen_toner/${zoom}/${tile.x}/${tile.y}.png`;
    });
  }

  applyDarkGreenTheme(ctx, width, height) {
    // Get the image data to manipulate pixels
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert to dark green theme with better readability
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate grayscale value for intensity mapping
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const intensity = gray / 255;

      if (intensity < 0.15) {
        // Very dark areas -> almost black with minimal green tint
        data[i] = Math.floor(intensity * 15); // R: 0-2
        data[i + 1] = Math.floor(intensity * 25); // G: 0-4
        data[i + 2] = Math.floor(intensity * 15); // B: 0-2
      } else if (intensity < 0.35) {
        // Medium dark areas -> darker green but more visible
        const greenIntensity = (intensity - 0.15) / 0.2;
        data[i] = Math.floor(8 + greenIntensity * 22); // R: 8-30
        data[i + 1] = Math.floor(15 + greenIntensity * 45); // G: 15-60
        data[i + 2] = Math.floor(8 + greenIntensity * 22); // B: 8-30
      } else if (intensity < 0.65) {
        // Medium areas -> readable pip-boy green
        const greenIntensity = (intensity - 0.35) / 0.3;
        data[i] = Math.floor(20 + greenIntensity * 60); // R: 20-80
        data[i + 1] = Math.floor(40 + greenIntensity * 90); // G: 40-130
        data[i + 2] = Math.floor(15 + greenIntensity * 45); // B: 15-60
      } else {
        // Light areas -> brighter pip-boy green for good readability
        const greenIntensity = (intensity - 0.65) / 0.35;
        data[i] = Math.floor(50 + greenIntensity * 105); // R: 50-155
        data[i + 1] = Math.floor(80 + greenIntensity * 115); // G: 80-195
        data[i + 2] = Math.floor(25 + greenIntensity * 85); // B: 25-110
      }
    }

    // Put the modified image data back to canvas
    ctx.putImageData(imageData, 0, 0);
  }
  parseScheduleSections(text) {
    const lines = String(text || "").split("\n");
    const days = [];
    let current = null;
    lines.forEach((line) => {
      const headerMatch = line.match(/^([A-Z]+)\s*-\s*(.+)$/);
      if (headerMatch) {
        current = { title: `${headerMatch[1]} - ${headerMatch[2]}`, items: [] };
        days.push(current);
      } else if (current && line.trim().startsWith("- ")) {
        current.items.push(line.replace(/^\-\s*/, ""));
      }
    });
    return days;
  }
  toggleSchedule(title) {
    this.setState((prev) => ({
      scheduleOpen: {
        ...prev.scheduleOpen,
        [title]: !prev.scheduleOpen[title],
      },
    }));
  }
  loadQuestsState() {
    try {
      const raw = localStorage.getItem("pipboy_quests_checked");
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object") {
        this.setState({ questsChecked: parsed });
      }
    } catch (e) {}
  }
  saveQuestsState(next) {
    try {
      localStorage.setItem("pipboy_quests_checked", JSON.stringify(next));
    } catch (e) {}
  }
  toggleQuest(label) {
    this.setState((prev) => {
      const next = {
        ...prev.questsChecked,
        [label]: !prev.questsChecked[label],
      };
      this.saveQuestsState(next);
      return { questsChecked: next };
    });
  }
  render() {
    let activeitem = this.getActiveItem(this.props.activeCategory);
    const descriptionStyle = this.state.descriptionStyle || undefined;
    const isData = this.props.activeCategory.name === "DATA";
    const isSchedule = isData && activeitem.displayName === "SCHEDULE";
    const isQuests = isData && activeitem.displayName === "QUESTS";
    const isRadio =
      this.props.activeCategory.name === "RADIO" &&
      activeitem.displayName === "RADIO";
    const isMap = this.props.activeCategory.name === "MAP";
    let valueContent = null;
    if (isSchedule) {
      const sections = this.parseScheduleSections(this.state.datavalue);
      valueContent = (
        <div>
          {sections.map((sec) => {
            const open = !!this.state.scheduleOpen[sec.title];
            return (
              <div key={sec.title}>
                <div
                  className="value-line"
                  onClick={() => this.toggleSchedule(sec.title)}
                  style={{ cursor: "pointer" }}
                >
                  {open ? "▾ " : "▸ "}
                  {sec.title}
                </div>
                {open &&
                  sec.items.map((it, idx) => (
                    <div key={sec.title + ":" + idx} className="value-line">
                      - {it}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      );
    } else if (isRadio) {
      const nowStation = this._radioStations[this.state.radioCurrentIndex];
      const statusText = this.state.radioIsLoading
        ? "Connecting..."
        : this.state.radioIsPlaying && nowStation
        ? nowStation.name
        : "-";
      const buttonText = this.state.radioIsLoading
        ? "Loading..."
        : this.state.radioIsPlaying
        ? "Pause"
        : "Play";

      valueContent = (
        <div>
          <div className="value-line">Now Playing: {statusText}</div>
          <div
            className="value-line"
            style={{ cursor: "pointer" }}
            onClick={() =>
              this.state.radioIsPlaying ? this.pauseRadio() : this.playRadio()
            }
          >
            {buttonText}
          </div>
          <div className="value-line">
            Volume: {Math.round(this.state.radioVolume * 100)}%
          </div>
          <div className="value-line" style={{ paddingLeft: 0, textIndent: 0 }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={this.state.radioVolume}
              onChange={(e) => this.setRadioVolume(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      );
    } else if (isQuests) {
      const lines = String(this.state.datavalue || "").split("\n");
      valueContent = (
        <div>
          {lines.map((line, i) => {
            const m = line.match(/^\[\s*\]\s*(.+)$/);
            if (m) {
              const label = m[1];
              const checked = !!this.state.questsChecked[label];
              return (
                <div key={i} className="value-line">
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => this.toggleQuest(label)}
                      style={{ marginRight: "0.5em" }}
                    />
                    {label}
                  </label>
                </div>
              );
            }
            return (
              <div key={i} className="value-line">
                {line}
              </div>
            );
          })}
        </div>
      );
    } else if (isMap) {
      // static OpenStreetMap image
      const item = activeitem;
      const title = item ? item.displayName : "";
      valueContent = (
        <div>
          {!this.state.mapUrl && (
            <div className="value-line">{`Fetching ${title.toLowerCase()}...`}</div>
          )}
          {this.state.mapUrl && (
            <div 
              style={{ 
                overflow: "auto",
                maxWidth: "100%", 
                maxHeight: this.state.valueMaxHeight ? `${this.state.valueMaxHeight - 20}px` : "400px",
                border: "1px solid #19FF81",
                touchAction: "manipulation" // Enable native pinch-zoom and pan
              }}
            >
              <img 
                src={this.state.mapUrl} 
                alt={title}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block"
                }}
              />
            </div>
          )}
        </div>
      );
      valueContent = (
        <div>
          {String(this.state.datavalue || "")
            .split("\n")
            .map((line, i) => (
              <div key={i} className="value-line">
                {line}
              </div>
            ))}
        </div>
      );
    }
    return (
      <div className="main-content">
        <div className="list-view">
          <ul>
            {isRadio
              ? // Show radio stations in sidebar when RADIO category is active
                this._radioStations.map((station, index) => {
                  return (
                    <li
                      key={station.url}
                      onClick={() => this.selectStation(index)}
                      className={
                        index === this.state.radioCurrentIndex
                          ? "active menu-option"
                          : "menu-option"
                      }
                    >
                      {station.name}
                    </li>
                  );
                })
              : // Show regular category items for other categories
                this.props.activeCategory.items.map((item, index) => {
                  let setActive = this.props.setActive.bind(this, index);
                  return (
                    <li
                      key={index}
                      onClick={setActive}
                      className={
                        item.active ? "active menu-option" : "menu-option"
                      }
                    >
                      {item.displayName}
                    </li>
                  );
                })}
          </ul>
        </div>
        <div
          className="main-view"
          style={
            this.state.mainViewPadBottom
              ? { paddingBottom: this.state.mainViewPadBottom }
              : undefined
          }
        >
          <div className="container-main">
            <div className="center">
              <div className="title">{activeitem.displayName}</div>
              <div
                className="value"
                style={{
                  overflowY: "auto",
                  maxHeight: this.state.valueMaxHeight || "unset",
                }}
              >
                {valueContent}
              </div>
            </div>
          </div>
          <div className="description" style={descriptionStyle}>
            {activeitem.dataDescription}
          </div>
        </div>
      </div>
    );
  }
}

export default MainView;
