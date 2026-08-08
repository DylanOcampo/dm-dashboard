import { useNavigate } from "react-router-dom";
import { useState } from "react";
import profile from "../../assets/Header/Profile.svg";
import { useApp } from "../../context/AppContext";
import { LANGUAGES } from "../../i18n/language";
import logo from "../../assets/Dashboard/Logo.svg";
import addButton from "../../assets/Header/AddButton.svg";
import deco from "../../assets/Header/AccountDeco.svg";
import "./Header.css";

import backgroundDeco from "../../assets/Mods/Mark.png";

export default function Header({ activeView, onChangeView }) {
  const navigate = useNavigate();
  const [openModsMenu, setOpenModsMenu] = useState(false);
  const { t, scenes, 
    activeSceneId, setActiveSceneId, addScene, renameScene, removeScene, allModules, addModuleInstance } = useApp();


  

  return (
    <header className="header">
      <div className="header__top">
        <div
          className="header__logo__container"
          style={{ paddingLeft: "50px" }}
        >
          <img src={logo} alt="Logo" />
          <p style={{paddingLeft: "10px"}}>{t("header.brand")}</p>
          <button className="header__add-button">
            <img src={addButton} alt="Add" onClick={() => setOpenModsMenu(!openModsMenu)} />
          </button>
        </div>

        {openModsMenu && (
        <div className="header__mods-menu-container" >
          <div className="header__mods-menu-overlay" onClick={() => setOpenModsMenu(false)}></div>
          <>
          
          <div className="header__mods-menu" style={{ backgroundImage: `url(${backgroundDeco})` }}>
            {allModules.map((mod) => (
              <div key={mod.id} className="header__mods-menu-item" onClick={() => { addModuleInstance(mod.id); setOpenModsMenu(false); }}>
                <img src={require(`../../assets/Mods/${mod.id}.svg`)} alt={mod.label} className="header__mods-menu-item__icon" />
                {mod.label}
              </div>
            ))}
          </div>
          
          </>
        </div>
        )}

        <div
          className="header__logo__container"
          style={{ paddingRight: "50px" }}
        >
          <img src={profile} alt="Logo" onClick={() => onChangeView('account')} />
          <p style={{paddingLeft: "10px"}}>{t("header.account")}</p>
          <button className="header__add-button">
            <img src={deco} alt="Decorative" onClick={() => onChangeView('share')}  />
          </button>
        </div>
      </div>

    <div className="dashboard__scenes" style={{ paddingLeft: "40px" }}>
        {scenes.map((scene) =>
          scene.id === activeSceneId ? (
            <div key={scene.id} className="dashboard__scene-tab is-active">
              <input
                type="text"
                className="dashboard__scene-name-input"
                value={scene.name}
                onChange={(e) => renameScene(scene.id, e.target.value)}
                aria-label={t('scenes.renameAria')}
              />
              {scenes.length > 1 && (
                <button
                  type="button"
                  className="dashboard__scene-remove"
                  onClick={() => removeScene(scene.id)}
                  aria-label={t('scenes.removeAria', { name: scene.name })}
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            <button
              key={scene.id}
              type="button"
              className="dashboard__scene-tab"
              onClick={() => setActiveSceneId(scene.id)}
            >
              {scene.name}
            </button>
          )
        )}
        <button type="button" className="dashboard__scene-add" onClick={addScene}>
          <div style={{overflow: "visible", maxWidth: "0px", maxHeight: "0px"}}>
            <img src={addButton} alt="Add" style={{ width: "32px", position: "relative", top: "-12px" }} />
          </div>
        </button>
      </div>

    </header>
  );
}
