// PlayUpCarPlay.swift
//
// Native CarPlay bridge. The Expo config plugin
// `withCarPlay` registers this class as the scene delegate for the
// `CPTemplateApplicationSceneSessionRoleApplication` role.
//
// JS pushes the browse tree and now-playing snapshots; the scene renders
// a `CPListTemplate` and a `CPNowPlayingTemplate`. User taps and transport
// commands are forwarded to JS as `PlayUpCarPlayCommand` events.

import CarPlay
import Foundation
import MediaPlayer
import React

@objc(PlayUpCarPlay)
final class PlayUpCarPlay: RCTEventEmitter {
  static var shared: PlayUpCarPlay?

  private var interfaceController: CPInterfaceController?
  private var listTemplate: CPListTemplate?
  private var nowPlayingTemplate: CPNowPlayingTemplate?
  private var items: [[String: Any]] = []

  override init() {
    super.init()
    PlayUpCarPlay.shared = self
    configureRemoteCommands()
  }

  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["PlayUpCarPlayCommand"] }

  // MARK: - JS API

  @objc func setSurface(_ payload: NSDictionary,
                        resolver: @escaping RCTPromiseResolveBlock,
                        rejecter: @escaping RCTPromiseRejectBlock) {
    let title = payload["rootTitle"] as? String ?? "PlayUP"
    let items = payload["items"] as? [[String: Any]] ?? []
    self.items = items

    let listItems: [CPListItem] = items.map { item in
      let li = CPListItem(text: item["title"] as? String,
                          detailText: item["subtitle"] as? String)
      li.handler = { [weak self] _, completion in
        if let id = item["id"] as? String {
          self?.sendEvent(withName: "PlayUpCarPlayCommand",
                          body: ["type": "playId", "id": id])
        }
        completion()
      }
      return li
    }

    let section = CPListSection(items: listItems)
    let template = CPListTemplate(title: title, sections: [section])
    self.listTemplate = template
    interfaceController?.setRootTemplate(template, animated: false, completion: nil)
    resolver(nil)
  }

  @objc func setNowPlaying(_ payload: NSDictionary,
                           resolver: @escaping RCTPromiseResolveBlock,
                           rejecter: @escaping RCTPromiseRejectBlock) {
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: payload["title"] as? String ?? "",
      MPMediaItemPropertyArtist: payload["artist"] as? String ?? "",
    ]
    if let dur = payload["durationMs"] as? Double {
      info[MPMediaItemPropertyPlaybackDuration] = dur / 1000.0
    }
    if let pos = payload["positionMs"] as? Double {
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = pos / 1000.0
    }
    let playing = (payload["playing"] as? Bool) ?? false
    info[MPNowPlayingInfoPropertyPlaybackRate] = playing ? 1.0 : 0.0
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info

    if nowPlayingTemplate == nil {
      let np = CPNowPlayingTemplate.shared
      nowPlayingTemplate = np
      interfaceController?.pushTemplate(np, animated: true, completion: nil)
    }
    resolver(nil)
  }

  // MARK: - Scene plumbing

  func attach(_ controller: CPInterfaceController) {
    self.interfaceController = controller
    if let template = listTemplate {
      controller.setRootTemplate(template, animated: false, completion: nil)
    }
  }

  func detach() {
    self.interfaceController = nil
  }

  private func configureRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()
    center.playCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "PlayUpCarPlayCommand", body: ["type": "play"])
      return .success
    }
    center.pauseCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "PlayUpCarPlayCommand", body: ["type": "pause"])
      return .success
    }
    center.nextTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "PlayUpCarPlayCommand", body: ["type": "next"])
      return .success
    }
    center.previousTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent(withName: "PlayUpCarPlayCommand", body: ["type": "previous"])
      return .success
    }
    center.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard let e = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
      self?.sendEvent(withName: "PlayUpCarPlayCommand",
                      body: ["type": "seek", "positionMs": Int(e.positionTime * 1000)])
      return .success
    }
  }
}

@objc(PlayUpCarPlaySceneDelegate)
final class PlayUpCarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
  func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                didConnect interfaceController: CPInterfaceController) {
    PlayUpCarPlay.shared?.attach(interfaceController)
  }

  func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                didDisconnect interfaceController: CPInterfaceController) {
    PlayUpCarPlay.shared?.detach()
  }
}
