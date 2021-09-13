import React, { useEffect, useRef, useState } from 'react';
import settings from 'electron-settings';
import { ButtonToolbar } from 'rsuite';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import useSearchQuery from '../../hooks/useSearchQuery';
import {
  moveUp,
  moveDown,
  setPlayerIndex,
  setPlayerVolume,
  fixPlayer2Index,
  clearPlayQueue,
  shuffleInPlace,
  toggleShuffle,
  moveToIndex,
} from '../../redux/playQueueSlice';
import {
  toggleSelected,
  setRangeSelected,
  toggleRangeSelected,
  setSelected,
  clearSelected,
  setIsDragging,
} from '../../redux/multiSelectSlice';
import GenericPage from '../layout/GenericPage';
import GenericPageHeader from '../layout/GenericPageHeader';
import ListViewType from '../viewtypes/ListViewType';
import PageLoader from '../loader/PageLoader';
import { resetPlayer, setStatus } from '../../redux/playerSlice';
import { ClearQueueButton, ShuffleButton } from '../shared/ToolbarButtons';
import { StyledCheckbox } from '../shared/styled';

const NowPlayingView = () => {
  const tableRef = useRef<any>();
  const dispatch = useAppDispatch();
  const playQueue = useAppSelector((state) => state.playQueue);
  const multiSelect = useAppSelector((state) => state.multiSelect);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollWithCurrent, setScrollWithCurrent] = useState(
    Boolean(settings.getSync('scrollWithCurrentSong'))
  );
  const filteredData = useSearchQuery(searchQuery, playQueue.entry, [
    'title',
    'artist',
    'album',
  ]);

  useEffect(() => {
    if (scrollWithCurrent) {
      setTimeout(() => {
        const rowHeight = Number(settings.getSync('songListRowHeight'));
        tableRef?.current.table.current?.scrollTop(
          rowHeight * playQueue.currentIndex - rowHeight > 0
            ? rowHeight * playQueue.currentIndex - rowHeight
            : 0
        );
      }, 100);
    }
  }, [playQueue.currentIndex, scrollWithCurrent, tableRef]);

  let timeout: any = null;
  const handleRowClick = (e: any, rowData: any) => {
    if (timeout === null) {
      timeout = window.setTimeout(() => {
        timeout = null;

        if (e.ctrlKey) {
          dispatch(toggleSelected(rowData));
        } else if (e.shiftKey) {
          dispatch(setRangeSelected(rowData));
          if (searchQuery !== '') {
            dispatch(toggleRangeSelected(filteredData));
          } else {
            dispatch(
              toggleRangeSelected(
                playQueue.shuffle ? playQueue.shuffledEntry : playQueue.entry
              )
            );
          }
        } else {
          dispatch(setSelected(rowData));
        }
      }, 300);
    }
  };

  const handleRowDoubleClick = (rowData: any) => {
    window.clearTimeout(timeout);
    timeout = null;

    // Reset volumes when changing to a new track
    dispatch(setPlayerVolume({ player: 1, volume: playQueue.volume }));
    dispatch(setPlayerVolume({ player: 2, volume: 0 }));

    dispatch(clearSelected());
    dispatch(resetPlayer());
    dispatch(setPlayerIndex(rowData));
    dispatch(fixPlayer2Index());
    dispatch(setStatus('PLAYING'));
  };

  const handleUpClick = () => {
    const selectedIndexes: any[] = [];
    multiSelect.selected.map((selected: any) => {
      return selectedIndexes.push(
        playQueue.entry.findIndex((item: any) => item.id === selected.id)
      );
    });
    dispatch(moveUp(selectedIndexes));
  };

  const handleDownClick = () => {
    const selectedIndexes: any[] = [];
    multiSelect.selected.map((selected: any) => {
      return selectedIndexes.push(
        playQueue.entry.findIndex((item: any) => item.id === selected.id)
      );
    });
    dispatch(moveDown(selectedIndexes));
  };

  const handleDragEnd = () => {
    if (multiSelect.isDragging) {
      dispatch(
        moveToIndex({
          entries: multiSelect.selected,
          moveBeforeId: multiSelect.currentMouseOverId,
        })
      );
      dispatch(setIsDragging(false));
      dispatch(fixPlayer2Index());
    }
  };

  if (!playQueue) {
    return <PageLoader />;
  }

  return (
    <GenericPage
      hideDivider
      header={
        <GenericPageHeader
          title="Now Playing"
          subtitle={
            <>
              <ButtonToolbar>
                <ClearQueueButton
                  size="sm"
                  width={100}
                  onClick={() => {
                    dispatch(clearPlayQueue());
                    dispatch(setStatus('PAUSED'));
                    // Needs a timeout otherwise the seek may still update after the pause due to
                    // the delay timeout
                    setTimeout(() => dispatch(resetPlayer()), 200);
                  }}
                />
                <ShuffleButton
                  size="sm"
                  width={100}
                  onClick={() => {
                    if (playQueue.shuffle) {
                      dispatch(shuffleInPlace());
                    } else {
                      dispatch(toggleShuffle());
                    }
                  }}
                />
              </ButtonToolbar>
            </>
          }
          subsidetitle={
            <StyledCheckbox
              defaultChecked={scrollWithCurrent}
              onChange={() => {
                settings.setSync(
                  'scrollWithCurrentSong',
                  !settings.getSync('scrollWithCurrentSong')
                );
                setScrollWithCurrent(!scrollWithCurrent);
              }}
            >
              Auto scroll
            </StyledCheckbox>
          }
          searchQuery={searchQuery}
          handleSearch={(e: any) => setSearchQuery(e)}
          clearSearchQuery={() => setSearchQuery('')}
          showSearchBar
        />
      }
    >
      <ListViewType
        ref={tableRef}
        data={
          searchQuery !== ''
            ? filteredData
            : playQueue.shuffle
            ? playQueue.shuffledEntry
            : playQueue.entry
        }
        currentIndex={playQueue.currentIndex}
        tableColumns={settings.getSync('songListColumns')}
        handleRowClick={handleRowClick}
        handleRowDoubleClick={handleRowDoubleClick}
        handleUpClick={handleUpClick}
        handleDownClick={handleDownClick}
        handleDragEnd={handleDragEnd}
        virtualized
        rowHeight={Number(settings.getSync('songListRowHeight'))}
        fontSize={Number(settings.getSync('songListFontSize'))}
        cacheImages={{
          enabled: settings.getSync('cacheImages'),
          cacheType: 'album',
          cacheIdProperty: 'albumId',
        }}
        listType="song"
        nowPlaying
        dnd
      />
    </GenericPage>
  );
};

export default NowPlayingView;
